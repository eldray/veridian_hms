import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { PatientService } from './PatientService';
import { CreatePatientDTO, PatientFilters, CreateAllergyDTO, CreateMedicalHistoryDTO } from './PatientTypes';

import prisma from '../../core/database/prisma.client';

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

  generateCCC = this.asyncHandler(async (req: Request, res: Response) => {
    const { patientId, nhisNumber } = req.body;
    
    if (!nhisNumber) {
      return res.status(400).json({ success: false, message: 'NHIS number is required' });
    }

    const { nhisApiService } = await import('../../services/nhisApi.service');
    
    try {
      const cccId = await nhisApiService.generateCCC(nhisNumber, { patientId });
      
      const { PatientService } = await import('./PatientService');
      const patientService = new PatientService();
      await patientService.updatePatient(patientId, { cccId });
      
      return res.json({ success: true, cccId, message: 'CCC generated successfully' });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to generate CCC' 
      });
    }
  });

  // ── Patient photo ─────────────────────────────────────────────
  private static readonly IMAGE_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'
  };

  /** POST /patients/:id/upload-image  (multipart, field "image") */
  uploadImage = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, message: 'No image file received (field name must be "image")' });

    await this.service.getPatientById(id); // 404 if the patient does not exist
    const imageUrl = `/uploads/patients/${file.filename}`;
    await this.service.updatePatient(id, { imageUrl } as any);
    return this.ok(res, { imageUrl }, 'Patient image uploaded');
  });

  /** POST /patients/:id/upload-image-base64  ({ image: "data:image/jpeg;base64,..." }) */
  uploadImageBase64 = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const raw: string | undefined = req.body?.image;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ success: false, message: 'image (base64) is required' });
    }

    const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/s.exec(raw);
    const mime = match ? match[1].toLowerCase() : 'image/jpeg'; // bare base64 is treated as JPEG
    const ext = PatientController.IMAGE_TYPES[mime];
    if (!ext) return res.status(400).json({ success: false, message: 'Only JPEG, PNG or WebP images are allowed' });

    const buffer = Buffer.from(match ? match[2] : raw, 'base64');
    if (buffer.length === 0) return res.status(400).json({ success: false, message: 'Image is empty or not valid base64' });
    if (buffer.length > 10 * 1024 * 1024) return res.status(413).json({ success: false, message: 'Image is larger than 10 MB' });

    await this.service.getPatientById(id); // 404 if the patient does not exist

    const dir = path.join(process.cwd(), 'uploads', 'patients');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `patient-${id}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), buffer);

    const imageUrl = `/uploads/patients/${filename}`;
    await this.service.updatePatient(id, { imageUrl } as any);
    return this.ok(res, { imageUrl }, 'Patient image uploaded');
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