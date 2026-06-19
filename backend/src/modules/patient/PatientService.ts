import { PrismaClient, Patient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { PatientRepository } from './PatientRepository';
import { CreatePatientDTO, UpdatePatientDTO, PatientFilters, PatientSummary, CreateAllergyDTO, CreateMedicalHistoryDTO } from './PatientTypes';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { getCounterService } from '../../services/CounterService'; 

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

  private async validateCorporateData(data: CreatePatientDTO): Promise<void> {
    if (data.paymentMode === 'corporate') {
      if (!data.corporateAccountId && !data.insuranceProviderId) {
        throw new ValidationError('Corporate account required for corporate payment mode', [{ field: 'corporateAccountId', message: 'Corporate account ID is required', code: 'MISSING_CORPORATE' }]);
      }
      const corporateAccount = await this.prisma.corporateAccount.findUnique({ where: { id: data.corporateAccountId || data.insuranceProviderId } });
      if (!corporateAccount) throw new ValidationError('Corporate account not found', [{ field: 'corporateAccountId', message: 'Invalid corporate account ID', code: 'INVALID_CORPORATE' }]);
      if (!corporateAccount.isActive) throw new ValidationError('Corporate account is inactive', [{ field: 'corporateAccountId', message: 'Corporate account is not active', code: 'INACTIVE_CORPORATE' }]);
      this.logInfo('Corporate account validated', { corporateAccountId: corporateAccount.id, companyName: corporateAccount.companyName });
    }
  }

  async createPatient(data: CreatePatientDTO): Promise<Patient> {
    this.logInfo('Creating new patient', { nhisNumber: data.nhisNumber, paymentMode: data.paymentMode });
    this.validateCreateData(data);
    await this.checkDuplicates(data);
    await this.validateCorporateData(data);

    const counterService = getCounterService();
    const patientData = {
      ...data,
      folderNumber: data.folderNumber || counterService.nextPatientNumber(),
      dateOfBirth: new Date(data.dateOfBirth),
      registeredAt: new Date(),
      registeredBy: 'system',
      insuranceProviderId: data.paymentMode === 'corporate' ? data.corporateAccountId : data.insuranceProviderId
    };

    const patient = await this.repository.create(patientData);
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

  async updatePatient(id: string, data: UpdatePatientDTO): Promise<Patient> {
    this.logInfo('Updating patient', { id });
    await this.getPatientById(id);
    await this.checkDuplicates(data as CreatePatientDTO, id);
    const updateData = { ...data, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined };
    const patient = await this.repository.update(id, updateData);
    this.logInfo('Patient updated successfully', { id });
    return patient;
  }

  async deletePatient(id: string): Promise<void> {
    this.logInfo('Deleting patient', { id });
    await this.getPatientById(id);
    const hasRelatedRecords = await this.repository.hasRelatedRecords(id);
    if (hasRelatedRecords) {
      throw new ValidationError('Cannot delete patient with existing records', [{ field: 'id', message: 'Patient has associated records. Consider deactivating instead.', code: 'HAS_RELATIONS' }]);
    }
    await this.repository.delete(id);
    this.logInfo('Patient deleted successfully', { id });
  }

  async getPatientStats() {
    this.logInfo('Fetching patient statistics');
    return this.repository.getStats();
  }

  async getPatientSummaries(limit: number = 10): Promise<PatientSummary[]> {
    const patients = await this.repository.findMany({
      take: limit, orderBy: { createdAt: 'desc' },
      include: { Attendance: { orderBy: { dateTime: 'desc' }, take: 1, select: { dateTime: true } } }
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

  async addAllergy(patientId: string, data: CreateAllergyDTO) {
    await this.getPatientById(patientId); // Ensure patient exists
    this.logInfo('Adding allergy to patient', { patientId, allergen: data.allergen });
    return this.repository.createAllergy(patientId, data);
  }

  async getAllergies(patientId: string) {
    await this.getPatientById(patientId);
    return this.repository.findAllergies(patientId);
  }

  async addMedicalHistory(patientId: string, data: CreateMedicalHistoryDTO) {
    await this.getPatientById(patientId);
    this.logInfo('Adding medical history to patient', { patientId, condition: data.condition });
    return this.repository.createMedicalHistory(patientId, data);
  }

  async getMedicalHistories(patientId: string) {
    await this.getPatientById(patientId);
    return this.repository.findMedicalHistories(patientId);
  }
}