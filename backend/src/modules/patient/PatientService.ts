import { Prisma, PrismaClient, Patient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { PatientRepository } from './PatientRepository';
import { CreatePatientDTO, UpdatePatientDTO, PatientFilters, PatientSummary, CreateAllergyDTO, CreateMedicalHistoryDTO } from './PatientTypes';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { getCounterService } from '../../services/CounterService';
import { appendAuditLogWithinTransaction } from '../../services/auditChain'; 

// Only patient-facing fields may be written from registration/edit requests.
// Identity, registration timestamps and database-managed fields are always server-owned.
const PATIENT_WRITE_FIELDS = [
  'folderNumber', 'surname', 'otherNames', 'gender', 'maritalStatus',
  'dateOfBirth', 'contact', 'address', 'residenceCommunity',
  'residenceDistrict', 'residenceRegion', 'paymentMode', 'insuranceDetails',
  'additionalInfo', 'billingAddress', 'employer', 'imageUrl',
  'nhisNumber', 'cccId', 'nhisExpiryDate',
  'nhisActive', 'phoneNumber',
] as const;

function pickPatientWriteFields<T extends object>(
  data: T,
): Pick<T, Extract<keyof T, (typeof PATIENT_WRITE_FIELDS)[number]>> {
  const source = data as Record<string, unknown>;
  return Object.fromEntries(
    PATIENT_WRITE_FIELDS
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  ) as Pick<T, Extract<keyof T, (typeof PATIENT_WRITE_FIELDS)[number]>>;
}

function cleanAllergyEntries(entries: CreateAllergyDTO[]) {
  return entries.map(({ allergen, reaction, severity, notes }) => ({
    allergen,
    ...(reaction !== undefined && { reaction }),
    ...(severity !== undefined && { severity }),
    ...(notes !== undefined && { notes }),
  }));
}

function cleanMedicalHistoryEntries(entries: CreateMedicalHistoryDTO[]) {
  return entries.map(({ condition, diagnosedAt, notes }) => ({
    condition,
    diagnosedAt: diagnosedAt ? new Date(diagnosedAt) : undefined,
    notes,
  }));
}

function cleanSurgicalHistoryEntries(entries: CreatePatientDTO['surgicalHistories']) {
  return (entries || []).map(({ procedure, surgeryDate, notes }) => ({
    procedure,
    surgeryDate: surgeryDate ? new Date(surgeryDate) : undefined,
    notes,
  }));
}

function cleanFamilyHistoryEntries(entries: CreatePatientDTO['familyHistories']) {
  return (entries || []).map(({ relation, condition, notes }) => ({
    relation, condition, notes,
  }));
}


export class PatientService extends BaseService {
  private repository: PatientRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('PatientService');
    this.prisma = prisma;
    this.repository = new PatientRepository(prisma);
  }

  // ✅ Made public so Controller can use it for DRY age calculation
  public calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  private validateCreateData(data: CreatePatientDTO): void {
    const errors: any[] = [];
    if (!data.surname || data.surname.trim().length === 0) errors.push({ field: 'surname', message: 'Surname is required' });
    if (!data.otherNames || data.otherNames.trim().length === 0) errors.push({ field: 'otherNames', message: 'Other names are required' });
    if (!data.dateOfBirth) {
      errors.push({ field: 'dateOfBirth', message: 'Date of birth is required' });
    } else {
      const dob = new Date(data.dateOfBirth);
      if (dob > new Date()) errors.push({ field: 'dateOfBirth', message: 'Date of birth cannot be in the future' });
    }
    if (!data.gender) errors.push({ field: 'gender', message: 'Gender is required' });
    if (errors.length > 0) throw new ValidationError('Validation failed', errors);
  }

  // A GHSS membership number is 8 digits, or those same 8 digits written in a 10-digit field
  // with a "00" prefix. Enforce here as well as on the form, because claims and the counter
  // bench can both write this field.
  private validateNhisNumber(data: { nhisNumber?: string | null }): void {
    const value = String(data.nhisNumber ?? '').trim();
    if (!value) return;
    if (!/^\d+$/.test(value)) {
      throw new ValidationError('NHIS number must be digits only', [{ field: 'nhisNumber', message: 'NHIS number must be digits only - no letters, spaces or dashes', code: 'INVALID_FORMAT' }]);
    }
    if (value.length === 8) return;
    if (value.length === 10 && /^00\d{8}$/.test(value)) return;
    if (value.length !== 8 && value.length !== 10) {
      throw new ValidationError(`NHIS number must be 8 or 10 digits, not ${value.length}`, [{ field: 'nhisNumber', message: 'NHIS number must be 8 or 10 digits', code: 'INVALID_FORMAT' }]);
    }
    throw new ValidationError('A 10-digit NHIS number must start with 00', [{ field: 'nhisNumber', message: 'A 10-digit NHIS number is the 8-digit number with a 00 prefix', code: 'INVALID_FORMAT' }]);
  }

  private async checkDuplicates(data: CreatePatientDTO, excludeId?: string): Promise<void> {
    if (data.nhisNumber) {
      const existing = await this.repository.findByNHISNumber(data.nhisNumber);
      if (existing && (!excludeId || existing.id !== excludeId)) {
        throw new ValidationError('A patient with this NHIS number already exists', [{ field: 'nhisNumber', message: 'NHIS number already registered', code: 'DUPLICATE' }]);
      }
    }
    if (data.insuranceDetails?.insuranceNumber) {
      const existing = await this.repository.findByInsuranceNumber(data.insuranceDetails.insuranceNumber);
      if (existing && (!excludeId || existing.id !== excludeId)) {
        throw new ValidationError('A patient with this insurance number already exists', [{ field: 'insuranceNumber', message: 'Insurance number already registered', code: 'DUPLICATE' }]);
      }
    }
    if (data.corporateEmployeeId) {
      const existing = await this.repository.findByCorporateEmployeeId(data.corporateEmployeeId);
      if (existing) {
         // Note: CorporateEmployee uniqueness is complex, keeping your original logic structure
      }
    }
    if (data.folderNumber) {
      const existing = await this.repository.findByFolderNumber(data.folderNumber);
      if (existing && (!excludeId || existing.id !== excludeId)) {
        throw new ValidationError('A patient with this folder number already exists', [{ field: 'folderNumber', message: 'Folder number already exists', code: 'DUPLICATE' }]);
      }
    }
  }

  private async validateCorporateData(data: CreatePatientDTO) {
    if (data.paymentMode === 'corporate') {
      if (!data.corporateAccountId && !data.insuranceProviderId) {
        throw new ValidationError('Corporate account required for corporate payment mode', [{ field: 'corporateAccountId', message: 'Corporate account ID is required', code: 'MISSING_CORPORATE' }]);
      }
      const corporateAccountId = data.corporateAccountId ?? data.insuranceProviderId;
      if (!corporateAccountId) {
        throw new ValidationError('Corporate account required for corporate payment mode', [{ field: 'corporateAccountId', message: 'Corporate account ID is required', code: 'MISSING_CORPORATE' }]);
      }
      const corporateAccount = await this.prisma.corporateAccount.findUnique({ where: { id: corporateAccountId } });
      if (!corporateAccount) throw new ValidationError('Corporate account not found', [{ field: 'corporateAccountId', message: 'Invalid corporate account ID', code: 'INVALID_CORPORATE' }]);
      if (!corporateAccount.isActive) throw new ValidationError('Corporate account is inactive', [{ field: 'corporateAccountId', message: 'Corporate account is not active', code: 'INACTIVE_CORPORATE' }]);
      this.logInfo('Corporate account validated', { corporateAccountId: corporateAccount.id, companyName: corporateAccount.companyName });
      return corporateAccount;
    }
    return null;
  }

  /**
   * Validate the structured clinical history at the API boundary. The UI filters
   * blank rows, but API clients must not be able to persist empty allergy names
   * or arbitrary severity values.
   */
  private validateClinicalHistory(data: Partial<CreatePatientDTO>): void {
    const errors: any[] = [];
    const allowedSeverities = new Set(['mild', 'moderate', 'severe']);

    if (data.allergies !== undefined) {
      if (!Array.isArray(data.allergies)) {
        errors.push({ field: 'allergies', message: 'Allergies must be provided as a list' });
      } else {
        data.allergies.forEach((allergy, index) => {
          if (!allergy || typeof allergy.allergen !== 'string' || !allergy.allergen.trim()) {
            errors.push({ field: `allergies[${index}].allergen`, message: 'Allergen name is required' });
          }
          if (allergy?.severity && !allowedSeverities.has(String(allergy.severity).toLowerCase())) {
            errors.push({ field: `allergies[${index}].severity`, message: 'Severity must be mild, moderate, or severe' });
          }
        });
      }
    }

    if (data.medicalHistories !== undefined && !Array.isArray(data.medicalHistories)) {
      errors.push({ field: 'medicalHistories', message: 'Medical histories must be provided as a list' });
    } else {
      (data.medicalHistories || []).forEach((history, index) => {
        if (!history || typeof history.condition !== 'string' || !history.condition.trim()) {
          errors.push({ field: `medicalHistories[${index}].condition`, message: 'Medical condition is required' });
        }
      });
    }

    if (data.surgicalHistories !== undefined && !Array.isArray(data.surgicalHistories)) {
      errors.push({ field: 'surgicalHistories', message: 'Surgical histories must be provided as a list' });
    } else {
      (data.surgicalHistories || []).forEach((history, index) => {
        if (!history || typeof history.procedure !== 'string' || !history.procedure.trim()) {
          errors.push({ field: `surgicalHistories[${index}].procedure`, message: 'Surgical procedure is required' });
        }
      });
    }

    if (data.familyHistories !== undefined && !Array.isArray(data.familyHistories)) {
      errors.push({ field: 'familyHistories', message: 'Family histories must be provided as a list' });
    } else {
      (data.familyHistories || []).forEach((history, index) => {
        if (!history || typeof history.relation !== 'string' || !history.relation.trim()) {
          errors.push({ field: `familyHistories[${index}].relation`, message: 'Family relationship is required' });
        }
        if (!history || typeof history.condition !== 'string' || !history.condition.trim()) {
          errors.push({ field: `familyHistories[${index}].condition`, message: 'Family medical condition is required' });
        }
      });
    }

    if (errors.length > 0) throw new ValidationError('Invalid clinical history', errors);
  }

  async createPatient(data: CreatePatientDTO, actorId: string) {
    if (!actorId) throw new ValidationError('Authenticated staff identity is required for patient audit');
    this.logInfo('Creating new patient', { nhisNumber: data.nhisNumber, paymentMode: data.paymentMode });
    this.validateCreateData(data);
    this.validateNhisNumber(data);
    this.validateClinicalHistory(data);
    await this.checkDuplicates(data);
    const corporateAccount = await this.validateCorporateData(data);

    const counterService = getCounterService();
    const {
      corporateEmployeeId,
      allergies,
      medicalHistories,
      surgicalHistories,
      familyHistories,
    } = data;
    const persistedData = pickPatientWriteFields(data);
    const insuranceProviderId = corporateAccount
      ? corporateAccount.insuranceProviderId
      : data.insuranceProviderId;
    const patientData = {
      ...persistedData,
      insuranceDetails: data.insuranceDetails ?? undefined,
      ...(allergies !== undefined && { allergies: { create: cleanAllergyEntries(allergies) } }),
      ...(medicalHistories !== undefined && {
        medicalHistories: {
          create: cleanMedicalHistoryEntries(medicalHistories),
        },
      }),
      ...(surgicalHistories !== undefined && {
        surgicalHistories: {
          create: cleanSurgicalHistoryEntries(surgicalHistories),
        },
      }),
      ...(familyHistories !== undefined && { familyHistories: { create: cleanFamilyHistoryEntries(familyHistories) } }),
      employer: corporateAccount
        ? {
            ...(data.employer || {}),
            corporateAccountId: corporateAccount.id,
            companyName: corporateAccount.companyName,
            employeeId: corporateEmployeeId || ''
          }
        : data.employer ?? undefined,
      folderNumber: data.folderNumber || counterService.nextPatientNumber(),
      dateOfBirth: new Date(data.dateOfBirth),
      nhisExpiryDate: data.nhisExpiryDate ? new Date(data.nhisExpiryDate) : undefined,
      registeredAt: new Date(),
      registeredBy: 'system',
      InsuranceProvider: insuranceProviderId
        ? { connect: { id: insuranceProviderId } }
        : undefined,
    };

    const patient = await this.prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: patientData,
        // Return the clinical information submitted with registration so the UI and
        // downstream workflows can immediately confirm what was saved.
        include: {
          allergies: true,
          medicalHistories: true,
          surgicalHistories: true,
          familyHistories: true,
        },
      });
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'Patient',
        entityId: created.id,
        action: 'CREATE',
        performedById: actorId,
        newState: { created: true },
        metadata: { source: 'patient.create', changedFields: Object.keys(persistedData).sort(), historiesIncluded: ['allergies', 'medicalHistories', 'surgicalHistories', 'familyHistories'].filter((key) => (data as any)[key] !== undefined) },
      });
      return created;
    });
    this.logInfo('Patient created successfully', { patientId: patient.id, folderNumber: patient.folderNumber });
    return patient;
  }

  async getPatientById(id: string, include?: any): Promise<Patient> {
    this.logDebug('Fetching patient by ID', { id });
    const patient = await this.repository.findById(id, include);
    if (!patient) throw new NotFoundError('Patient', id);
    return patient;
  }

  async getPatientByNHISNumber(nhisNumber: string): Promise<Patient> {
    this.logDebug('Fetching patient by NHIS number', { nhisNumber });
    const patient = await this.repository.findByNHISNumber(nhisNumber);
    if (!patient) throw new NotFoundError('Patient', `NHIS:${nhisNumber}`);
    return patient;
  }

  async searchPatients(filters: PatientFilters) {
    this.logInfo('Searching patients', { filters });
    const result = await this.repository.search(filters);
    return {
      data: result.data.map(p => ({ ...p, age: this.calculateAge(p.dateOfBirth), fullName: `${p.surname} ${p.otherNames || ''}`.trim() })),
      pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
    };
  }

  async updatePatient(id: string, data: UpdatePatientDTO, actorId: string): Promise<Patient> {
    if (!actorId) throw new ValidationError('Authenticated staff identity is required for patient audit');
    this.logInfo('Updating patient', { id });
    this.validateNhisNumber(data);
    this.validateClinicalHistory(data);
    await this.getPatientById(id);
    await this.checkDuplicates(data as CreatePatientDTO, id);
    const corporateAccount = await this.validateCorporateData(data as CreatePatientDTO);
    const {
      corporateEmployeeId,
      allergies,
      medicalHistories,
      surgicalHistories,
      familyHistories,
    } = data;
    const persistedData = pickPatientWriteFields(data as unknown as Record<string, unknown>);
    const insuranceProviderId = data.paymentMode === 'corporate' && corporateAccount
      ? corporateAccount.insuranceProviderId
      : data.insuranceProviderId;
    const updateData = {
      ...persistedData,
      ...(allergies !== undefined && {
        allergies: { deleteMany: {}, create: cleanAllergyEntries(allergies) },
      }),
      ...(medicalHistories !== undefined && {
        medicalHistories: {
          deleteMany: {},
          create: cleanMedicalHistoryEntries(medicalHistories),
        },
      }),
      ...(surgicalHistories !== undefined && {
        surgicalHistories: {
          deleteMany: {},
          create: cleanSurgicalHistoryEntries(surgicalHistories),
        },
      }),
      ...(familyHistories !== undefined && {
        familyHistories: { deleteMany: {}, create: cleanFamilyHistoryEntries(familyHistories) },
      }),
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      nhisExpiryDate: data.nhisExpiryDate
        ? new Date(data.nhisExpiryDate)
        : data.nhisExpiryDate === null
          ? null
          : undefined,
      insuranceDetails: data.insuranceDetails === null
        ? Prisma.JsonNull
        : data.insuranceDetails,
      employer: data.paymentMode === 'corporate' && corporateAccount
        ? {
            ...(data.employer || {}),
            corporateAccountId: corporateAccount.id,
            companyName: corporateAccount.companyName,
            employeeId: corporateEmployeeId || ''
          }
        : data.employer === null
          ? Prisma.JsonNull
          : data.employer,
      ...(insuranceProviderId !== undefined && {
        InsuranceProvider: insuranceProviderId
          ? { connect: { id: insuranceProviderId } }
          : { disconnect: true },
      })
    };
    const patient = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.patient.update({
        where: { id },
        data: updateData,
        include: {
          allergies: true,
          medicalHistories: true,
          surgicalHistories: true,
          familyHistories: true,
        },
      });
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'Patient',
        entityId: id,
        action: 'UPDATE',
        performedById: actorId,
        metadata: { source: 'patient.update', changedFields: Object.keys(updateData).sort() },
      });
      return updated;
    });
    this.logInfo('Patient updated successfully', { id });
    return patient;
  }

  async deletePatient(id: string, actorId: string): Promise<void> {
    if (!actorId) throw new ValidationError('Authenticated staff identity is required for patient audit');
    this.logInfo('Deleting patient', { id });
    await this.getPatientById(id);
    const hasRelatedRecords = await this.repository.hasRelatedRecords(id);
    if (hasRelatedRecords) {
      throw new ValidationError('Cannot delete patient with existing records', [{ field: 'id', message: 'Patient has associated records. Consider deactivating instead.', code: 'HAS_RELATIONS' }]);
    }
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.patient.findUnique({ where: { id }, select: { id: true } });
      if (!current) throw new NotFoundError('Patient', id);
      await tx.patient.delete({ where: { id } });
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'Patient',
        entityId: id,
        action: 'DELETE',
        performedById: actorId,
        previousState: { exists: true },
        metadata: { source: 'patient.delete' },
      });
    });
    this.logInfo('Patient deleted successfully', { id });
  }

  async getPatientStats() {
    this.logInfo('Fetching patient statistics');
    return this.repository.getStats();
  }

  async getPatientSummaries(limit: number = 10): Promise<PatientSummary[]> {
    const patients = await this.prisma.patient.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        Attendance: {
          orderBy: { dateTime: 'desc' },
          take: 1,
          select: { dateTime: true },
        },
      },
    });
    return patients.map(p => ({
      id: p.id, folderNumber: p.folderNumber, fullName: `${p.surname} ${p.otherNames || ''}`.trim(),
      age: this.calculateAge(p.dateOfBirth), gender: p.gender, nhisNumber: p.nhisNumber || undefined,
      contact: p.contact, registeredAt: p.registeredAt, lastVisit: p.Attendance[0]?.dateTime || undefined
    }));
  }

  async getPatientsByCorporateAccount(corporateAccountId: string, page: number = 1, limit: number = 10) {
    this.logInfo('Fetching patients by corporate account', { corporateAccountId });
    const result = await this.repository.search({ corporateAccountId, page, limit });
    return {
      data: result.data.map(p => ({ ...p, age: this.calculateAge(p.dateOfBirth), fullName: `${p.surname} ${p.otherNames || ''}`.trim() })),
      pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
    };
  }

  async getPatientCorporateSummary(patientId: string): Promise<any> {
    const patient = await this.getPatientById(patientId, { insuranceProvider: true });
    if (patient.paymentMode !== 'corporate') return { isCorporate: false, paymentMode: patient.paymentMode };

    const corporateAccount = await this.prisma.corporateAccount.findUnique({
      where: { id: patient.insuranceProviderId! },
      include: { employees: { where: { isActive: true }, select: { id: true, employeeId: true, firstName: true, lastName: true } } }
    });

    return {
      isCorporate: true, paymentMode: 'corporate',
      corporateAccount: { id: corporateAccount?.id, companyName: corporateAccount?.companyName, creditLimit: corporateAccount?.creditLimit, currentBalance: corporateAccount?.currentBalance }
    };
  }

  // ==========================================
  // NEW: EMR (Allergies & Histories) Methods
  // ==========================================

  async addAllergy(patientId: string, data: CreateAllergyDTO, actorId: string) {
    if (!actorId) throw new ValidationError('Authenticated staff identity is required for patient audit');
    await this.getPatientById(patientId); // Ensure patient exists
    this.logInfo('Adding allergy to patient', { patientId, allergen: data.allergen });
    return this.prisma.$transaction(async (tx) => {
      const allergy = await tx.patientAllergy.create({ data: { ...data, patientId } });
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'Patient', entityId: patientId, action: 'UPDATE', performedById: actorId,
        metadata: { source: 'patient.allergy.create', changedFields: ['allergies'] },
      });
      return allergy;
    });
  }

  async getAllergies(patientId: string) {
    await this.getPatientById(patientId);
    return this.repository.findAllergies(patientId);
  }

  async addMedicalHistory(patientId: string, data: CreateMedicalHistoryDTO, actorId: string) {
    if (!actorId) throw new ValidationError('Authenticated staff identity is required for patient audit');
    await this.getPatientById(patientId);
    this.logInfo('Adding medical history to patient', { patientId, condition: data.condition });
    return this.prisma.$transaction(async (tx) => {
      const history = await tx.patientMedicalHistory.create({
        data: { ...data, patientId, diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : undefined },
      });
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'Patient', entityId: patientId, action: 'UPDATE', performedById: actorId,
        metadata: { source: 'patient.medical_history.create', changedFields: ['medicalHistories'] },
      });
      return history;
    });
  }

  async getMedicalHistories(patientId: string) {
    await this.getPatientById(patientId);
    return this.repository.findMedicalHistories(patientId);
  }
}