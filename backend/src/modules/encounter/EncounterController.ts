import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client'; // ✅ Added import
import { BaseController } from '../../shared/base/BaseController';
import { EncounterService } from './EncounterService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { createPaginatedResponse } from '../../shared/types/ApiResponse';
import { CreateEncounterDTO, UpdateEncounterDTO, AddDiagnosisDTO, AddVitalsDTO, AddMedicationDTO, AddLabTestDTO, AddScanDTO, AddProcedureDTO, AddServiceDTO, WorklistQuery } from './EncounterTypes';
import { ValidationError } from '../../utils/errors';

const WORKLIST_VIEWS = ['pending', 'completed', 'outstanding'];

const ATTENDANCE_TYPES = [
  'emergency_acute', 'antenatal', 'postnatal', 'chronic_followup', 'specialist_consultation',
  'delivery', 'surgery', 'general_consultation', 'walk_in',
];

/**
 * A date typed into a filter is a clinic day, not an instant. Ghana is UTC+0 all year, so the day
 * is bounded in UTC and `2026-10-30` means that whole day rather than its first second.
 */
const dayBounds = (value: string, edge: 'start' | 'end'): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (parts) {
    const startOfDay = Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    if (Number.isNaN(startOfDay)) return null;
    return edge === 'start' ? new Date(startOfDay) : new Date(startOfDay + 86_400_000 - 1);
  }
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
};

export const parseWorklistQuery = (query: Record<string, any> = {}): WorklistQuery => {
  const rawView = typeof query.view === 'string' ? query.view.trim().toLowerCase() : '';
  if (rawView && !WORKLIST_VIEWS.includes(rawView)) {
    throw new ValidationError(
      `Unknown worklist view "${rawView}". Use pending, completed or outstanding.`,
      [{ field: 'view', message: 'Use pending, completed or outstanding.', code: 'invalid_view' }],
    );
  }

  const single = typeof query.date === 'string' ? query.date.trim() : '';
  const rawFrom = typeof query.dateFrom === 'string' ? query.dateFrom.trim() : '';
  const rawTo = typeof query.dateTo === 'string' ? query.dateTo.trim() : '';

  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  if (single && (rawFrom || rawTo)) {
    throw new ValidationError(
      'Send either date or dateFrom/dateTo for a worklist, not both.',
      [{ field: 'date', message: 'Pick one way to set the range.', code: 'conflicting_dates' }],
    );
  }

  const read = (value: string, edge: 'start' | 'end', field: string): Date => {
    const parsed = dayBounds(value, edge);
    if (!parsed) {
      throw new ValidationError(
        `"${value}" is not a date the worklist can use. Expected a day like 2026-10-30.`,
        [{ field, message: 'Expected a date like 2026-10-30.', code: 'invalid_date' }],
      );
    }
    return parsed;
  };

  if (single) {
    dateFrom = read(single, 'start', 'date');
    dateTo = read(single, 'end', 'date');
  } else {
    if (rawFrom) dateFrom = read(rawFrom, 'start', 'dateFrom');
    if (rawTo) dateTo = read(rawTo, 'end', 'dateTo');
    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new ValidationError(
        'The worklist start date is after its end date.',
        [{ field: 'dateFrom', message: 'Choose a start date before the end date.', code: 'inverted_range' }],
      );
    }
  }

  const rawType = typeof query.attendanceType === 'string'
    ? query.attendanceType
    : Array.isArray(query.attendanceType) ? query.attendanceType.join(',') : '';
  const attendanceTypes = rawType.split(',').map((value: string) => value.trim().toLowerCase()).filter(Boolean);
  const unknownType = attendanceTypes.find((value: string) => !ATTENDANCE_TYPES.includes(value));
  if (unknownType) {
    throw new ValidationError(
      `Unknown attendance type "${unknownType}" for a worklist.`,
      [{ field: 'attendanceType', message: 'Use a known attendance type.', code: 'invalid_attendance_type' }],
    );
  }

  return {
    view: (rawView || undefined) as WorklistQuery['view'],
    dateFrom,
    dateTo,
    ...(attendanceTypes.length ? { attendanceTypes } : {}),
  };
};


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

  finalizeClinicalRecord = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const record = await this.service.finalizeClinicalRecord(id, user.id);
    return this.ok(res, record, 'Clinical record finalized successfully');
  });

  updateStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user!;
    const encounter = await this.service.updateEncounterStatus(id, status, user.id);
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

  getLatestVitals = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const ids = String(req.query.ids || '').split(',').map((v) => v.trim()).filter(Boolean);
    const vitals = await this.service.getLatestVitals(ids);
    return this.ok(res, vitals, 'Latest vitals retrieved successfully');
  });

  getVitalsByEncounter = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const vitals = await this.service.getVitalsByEncounter(id);
    return this.ok(res, vitals, 'Vitals retrieved successfully');
  });

  /** Every reading for many encounters at once: GET /encounters/vitals/batch?ids=a,b,c */
  getVitalsByEncounters = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const ids = String(req.query.ids || '').split(',').map((v) => v.trim()).filter(Boolean);
    const vitals = await this.service.getVitalsByEncounters(ids);
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
    const normalizedQuantity = Number(quantity);
    const normalizedExpiryDate = expiryDate ? new Date(expiryDate) : undefined;

    const medication = await this.service.dispenseMedication(encounterId, medicationId, normalizedQuantity, user.id, batchNumber, normalizedExpiryDate);
    return this.ok(res, medication, 'Medication dispensed successfully');
  });

  updateMedication = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, medicationId } = req.params;
    // Stock dispensing must use the dedicated PUT /dispense route, which is
    // restricted to pharmacy/admin roles. Do not let the broader clinical
    // status-update route bypass that permission boundary.
    if (req.body?.status === 'dispensed') {
      return this.badRequest(res, 'Use the dedicated medication dispense endpoint to dispense stock');
    }
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
    const user = req.user!;

    const labOrder = await this.service.updateLabTestStatus(labTestId, status, { result, normalRange, units, notes }, user.id);
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

  // Uploads scan result images (multipart field "images"). The returned URLs are
  // persisted onto the scan via the subsequent updateScanStatus call from the client.
  uploadScanImages = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length === 0) {
      return this.badRequest(res, 'No images were uploaded.');
    }

    // Served through the authenticated /uploads route in server.ts
    const imageUrls = files.map((file) => `/uploads/scans/${file.filename}`);
    return this.ok(res, { imageUrls }, 'Scan images uploaded');
  });

  updateScanStatus = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { scanId } = req.params;
    const { status, result, findings, impression, imageUrls } = req.body;
    const user = req.user!;
    const scan = await this.service.updateScanStatus(scanId, status, { result, findings, impression, imageUrls }, user.id);
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
    const user = req.user!;
    const procedure = await this.service.updateProcedureStatus(procedureId, status, updates, user.id);
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

  /** Add several services to one encounter in one write: POST /encounters/:id/services/bulk */
  addServices = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const result = await this.service.addServices(id, items, req.user!.id);
    return this.created(res, result, `${result.added} service(s) added successfully`);
  });

  removeService = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { encounterId, serviceRenderedId } = req.params;
    await this.service.removeService(encounterId, serviceRenderedId);
    return this.ok(res, null, 'Service removed successfully');
  });

  getConsumableUses = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getConsumableUses(req.params.id);
    return this.ok(res, result, 'Consumable usage retrieved successfully');
  });

  recordConsumableUse = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.recordConsumableUse(req.params.id, req.body, req.user!.id);
    return this.created(res, result, 'Consumable use recorded successfully');
  });

  updateConsumableUse = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.updateConsumableUse(req.params.id, req.params.transactionId, req.body, req.user!.id);
    return this.ok(res, result, 'Consumable use updated successfully');
  });

  deleteConsumableUse = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteConsumableUse(req.params.id, req.params.transactionId, req.user!.id);
    return this.ok(res, null, 'Consumable use deleted successfully');
  });

  // ============================================
  // WORKLISTS (CLINICAL QUEUES)
  // ============================================

  getWorklistSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await this.service.getWorklistSummary();
    return this.ok(res, summary, 'Worklist summary retrieved');
  });

  getVitalsWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getVitalsWorklist(parseWorklistQuery(req.query));
    return this.ok(res, worklist, 'Vitals worklist retrieved');
  });

  getMedicalWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getMedicalWorklist(parseWorklistQuery(req.query));
    return this.ok(res, worklist, 'Medical worklist retrieved');
  });

  getOutstandingWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getOutstandingResultsWorklist(parseWorklistQuery(req.query));
    return this.ok(res, worklist, 'Outstanding results worklist retrieved');
  });

  getLabWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getLabWorklist(parseWorklistQuery(req.query));
    return this.ok(res, worklist, 'Lab worklist retrieved');
  });

  getPharmacyWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getPharmacyWorklist(parseWorklistQuery(req.query));
    return this.ok(res, worklist, 'Pharmacy worklist retrieved');
  });

  getRadiologyWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getRadiologyWorklist(parseWorklistQuery(req.query));
    return this.ok(res, worklist, 'Radiology worklist retrieved');
  });

  getProceduresWorklist = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const worklist = await this.service.getProceduresWorklist(parseWorklistQuery(req.query));
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

  getAdmissionStats = this.asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await this.service.getAdmissionStatistics();
    return this.ok(res, stats, 'Admission statistics retrieved');
  });

  getFormalIPDPatients = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getFormalIPDPatients({ ...req.query, page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Formal IPD patients retrieved');
  });

  getDetentionPatients = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getDetentionPatients({ ...req.query, page, limit });
    // The observation screen also reads `summary` (total / ready for decision)
    return res.json({
      ...createPaginatedResponse(result.data, { page, limit, total: result.total }, 'Detention patients retrieved'),
      summary: result.summary
    });
  });

  getAdmissionById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const admission = await this.service.getAdmissionById(req.params.id);
    return this.ok(res, admission, 'Admission retrieved');
  });

  getAdmissionsByPatient = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getAdmissionsByPatientId(req.params.patientId, { page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Patient admissions retrieved');
  });

  updateAdmission = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const admission = await this.service.updateAdmission(req.params.id, req.body, req.user!.id);
    return this.ok(res, admission, 'Admission updated');
  });

  deleteAdmission = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.deleteAdmission(req.params.id, req.user!.id, req.body?.reason);
    return this.ok(res, result, 'Admission cancelled; clinical history retained');
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

    referEncounter = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const result = await this.service.referFromEncounter(id, req.body, user.id);
    return this.ok(res, result, 'Patient referred successfully');
  });

  abscondEncounter = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const result = await this.service.abscondFromEncounter(id, req.body, user.id);
    return this.ok(res, result, 'Encounter marked absconded');
  });

  completeEncounter = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const result = await this.service.completeEncounter(id, user.id);
    return this.ok(res, result, 'Encounter completed');
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