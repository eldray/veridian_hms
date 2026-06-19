import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client'; // ✅ Added import
import { BaseController } from '../../shared/base/BaseController';
import { EncounterService } from './EncounterService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { CreateEncounterDTO, UpdateEncounterDTO, AddDiagnosisDTO, AddVitalsDTO, AddMedicationDTO, AddLabTestDTO, AddScanDTO, AddProcedureDTO, AddServiceDTO } from './EncounterTypes';

export class EncounterController extends BaseController {
  private service: EncounterService;

  // ✅ FIXED: Added prisma parameter and passed it to the service
  constructor(prisma: PrismaClient) {
    super();
    this.service = new EncounterService(prisma);
    console.log('✅ EncounterController initialized');
  }

  // ============================================
  // CORE ENCOUNTER OPERATIONS
  // ============================================

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: CreateEncounterDTO = req.body;
    const user = req.user!;
    
    const encounter = await this.service.createEncounter(data, user.id);
    return this.created(res, encounter, 'Encounter created successfully');
  });

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const filters = {
      ...req.query,
      page,
      limit,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined, // ✅ Fixed typo (was dateFrom)
    };

    const result = await this.service.getEncounters(filters);
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Encounters retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const encounter = await this.service.getEncounterById(id);
    return this.ok(res, encounter, 'Encounter retrieved successfully');
  });

  update = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data: UpdateEncounterDTO = req.body;
    const user = req.user!;

    const encounter = await this.service.updateEncounter(id, data, user.id);
    return this.ok(res, encounter, 'Encounter updated successfully');
  });

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await this.service.deleteEncounter(id);
    return this.ok(res, null, 'Encounter deleted successfully');
  });

  updateStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const encounter = await this.service.updateEncounterStatus(id, status);
    return this.ok(res, encounter, `Encounter status updated to ${status}`);
  });

  // ============================================
  // DIAGNOSIS MANAGEMENT
  // ============================================

  addDiagnosis = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data: AddDiagnosisDTO = req.body;
    const user = req.user!;

    const diagnosis = await this.service.addDiagnosis(id, data, user.id);
    return this.created(res, diagnosis, 'Diagnosis added successfully');
  });

  setPrimaryDiagnosis = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { diagnosisId } = req.body;
    const user = req.user!;

    const diagnosis = await this.service.setPrimaryDiagnosis(id, diagnosisId, user.id);
    return this.ok(res, diagnosis, 'Primary diagnosis set successfully');
  });

  removeDiagnosis = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, diagnosisId } = req.params;
    await this.service.removeDiagnosis(id, diagnosisId);
    return this.ok(res, null, 'Diagnosis removed successfully');
  });

  // ============================================
  // VITALS MANAGEMENT
  // ============================================

  getVitalsByEncounter = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const vitals = await this.service.getVitalsByEncounter(id);
    return this.ok(res, vitals, 'Vitals retrieved successfully');
  });

  addVitals = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data: AddVitalsDTO = req.body;
    const user = req.user!;

    const vitals = await this.service.addVitals(id, data, user.id);
    return this.created(res, vitals, 'Vitals recorded successfully');
  });

  updateVitals = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { vitalsId } = req.params;
    const vitals = await this.service.updateVitals(vitalsId, req.body);
    return this.ok(res, vitals, 'Vitals updated successfully');
  });

  deleteVitals = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { vitalsId } = req.params;
    await this.service.deleteVitals(vitalsId);
    return this.ok(res, null, 'Vitals deleted successfully');
  });

  // ============================================
  // MEDICATION & PRESCRIPTIONS
  // ============================================

  addPrescription = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data: AddMedicationDTO = req.body;
    const user = req.user!;

    const prescription = await this.service.addPrescription(id, data, user.id);
    return this.created(res, prescription, 'Prescription added successfully');
  });

  dispenseMedication = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, medicationId } = req.params;
    const { quantity, batchNumber, expiryDate } = req.body;
    const user = req.user!;

    const medication = await this.service.dispenseMedication(encounterId, medicationId, quantity, user.id, batchNumber, expiryDate);
    return this.ok(res, medication, 'Medication dispensed successfully');
  });

  updateMedication = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, medicationId } = req.params;
    const user = req.user!;
    const medication = await this.service.updateMedication(encounterId, medicationId, req.body, user.id);
    return this.ok(res, medication, 'Medication updated successfully');
  });

  removeMedication = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, medicationId } = req.params;
    await this.service.removeMedication(encounterId, medicationId);
    return this.ok(res, null, 'Medication removed successfully');
  });

  // ============================================
  // LAB & SCAN ORDERS
  // ============================================

  addLabTest = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data: AddLabTestDTO = req.body;
    const user = req.user!;

    const labOrder = await this.service.addLabTest(id, data, user.id);
    return this.created(res, labOrder, 'Lab order added successfully');
  });

  updateLabTestStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { labTestId } = req.params;
    const { status, result, normalRange, units, notes } = req.body;
    const user = req.user;

    const labOrder = await this.service.updateLabTestStatus(labTestId, status, { result, normalRange, units, notes }, user?.id);
    return this.ok(res, labOrder, 'Lab order status updated');
  });

  removeLabTest = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, labTestId } = req.params;
    await this.service.removeLabTest(encounterId, labTestId);
    return this.ok(res, null, 'Lab order removed successfully');
  });

  addScan = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data: AddScanDTO = req.body;
    const user = req.user!;

    const scan = await this.service.addScan(id, data, user.id);
    return this.created(res, scan, 'Scan added successfully');
  });

  updateScanStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { scanId } = req.params;
    const { status, result, findings, impression, imageUrls, performedById } = req.body;
    const scan = await this.service.updateScanStatus(scanId, status, { result, findings, impression, imageUrls, performedById });
    return this.ok(res, scan, 'Scan status updated');
  });

  removeScan = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, scanId } = req.params;
    await this.service.removeScan(encounterId, scanId);
    return this.ok(res, null, 'Scan removed successfully');
  });

  // ============================================
  // PROCEDURES & SERVICES
  // ============================================

  addProcedure = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data: AddProcedureDTO = req.body;
    const user = req.user!;

    const procedure = await this.service.addProcedure(id, data, user.id);
    return this.created(res, procedure, 'Procedure added successfully');
  });

  updateProcedureStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { procedureId } = req.params;
    const { status, ...updates } = req.body;
    const procedure = await this.service.updateProcedureStatus(procedureId, status, updates);
    return this.ok(res, procedure, 'Procedure status updated');
  });

  removeProcedure = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, procedureId } = req.params;
    await this.service.removeProcedure(encounterId, procedureId);
    return this.ok(res, null, 'Procedure removed successfully');
  });

  addService = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data: AddServiceDTO = req.body;
    const user = req.user!;

    const result = await this.service.addService(id, data, user.id);
    return this.created(res, result, 'Service added successfully');
  });

  removeService = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, serviceRenderedId } = req.params;
    await this.service.removeService(encounterId, serviceRenderedId);
    return this.ok(res, null, 'Service removed successfully');
  });

  // ============================================
  // WORKLISTS (CLINICAL QUEUES)
  // ============================================

  getWorklistSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await this.service.getWorklistSummary();
    return this.ok(res, summary, 'Worklist summary retrieved');
  });

  getVitalsWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getVitalsWorklist();
    return this.ok(res, worklist, 'Vitals worklist retrieved');
  });

  getMedicalWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getMedicalWorklist();
    return this.ok(res, worklist, 'Medical worklist retrieved');
  });

  getLabWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getLabWorklist();
    return this.ok(res, worklist, 'Lab worklist retrieved');
  });

  getPharmacyWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getPharmacyWorklist();
    return this.ok(res, worklist, 'Pharmacy worklist retrieved');
  });

  getRadiologyWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getRadiologyWorklist();
    return this.ok(res, worklist, 'Radiology worklist retrieved');
  });

  getProceduresWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getProceduresWorklist();
    return this.ok(res, worklist, 'Procedures worklist retrieved');
  });

  getMaternalWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getMaternalWorklist();
    return this.ok(res, worklist, 'Maternal worklist retrieved');
  });

  // ============================================
  // ADMISSION & DISCHARGE (IPD/DAYCASE)
  // ============================================

  createAdmission = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const admission = await this.service.createFormalAdmission(req.body, user.id);
    return this.created(res, admission, 'Formal admission created successfully');
  });

  getAllAdmissions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getAllAdmissions({ ...req.query, page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Admissions retrieved');
  });

  getFormalIPDPatients = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getFormalIPDPatients({ ...req.query, page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Formal IPD patients retrieved');
  });

  getDetentionPatients = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getDetentionPatients({ ...req.query, page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Detention patients retrieved');
  });

  convertDetentionToIPD = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const result = await this.service.convertDetentionToFormalIPD(id, req.body, user.id);
    return this.ok(res, result.admission, result.message);
  });

  dischargeEncounter = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const result = await this.service.dischargeFromEncounter(id, req.body, user.id);
    return this.ok(res, null, result.message);
  });

  getBedOccupancy = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const occupancy = await this.service.getBedOccupancy();
    return this.ok(res, occupancy.data, 'Bed occupancy retrieved', { summary: occupancy.summary });
  });

  getStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dateFrom, dateTo } = req.query;
    const stats = await this.service.getEncounterStats(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );
    return this.ok(res, stats, 'Encounter statistics retrieved');
  });

  getDaycasePatients = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getDaycasePatients({ ...req.query, page, limit }); 
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Daycase patients retrieved');
  });

  addDailyNotes = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const result = await this.service.addDailyNotes(id, req.body, user.id);
    return this.created(res, result.note, 'Daily notes added successfully');
  });

  // ✅ FIXED: Added the missing method that was causing the crash!
  convertDaycaseToIPD = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const result = await this.service.convertDaycaseToIPD(id, req.body, user.id);
    return this.ok(res, result, 'Daycase converted to IPD successfully');
  });
}