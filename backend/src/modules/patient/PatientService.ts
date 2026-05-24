/**
 * Patient Service
 * Business logic layer for Patient operations
 */

import { PrismaClient, Patient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { PatientRepository } from './PatientRepository';
import { CreatePatientDTO, UpdatePatientDTO, PatientFilters, PatientSummary } from './PatientTypes';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { getCounterService } from '../../services/CounterService'; 

export class PatientService extends BaseService {
  private repository: PatientRepository;
  private prisma: PrismaClient;  // ✅ ADDED - store prisma instance

  constructor(prisma: PrismaClient) {
    super('PatientService');
    this.prisma = prisma;  // ✅ ADDED - store for corporate queries
    this.repository = new PatientRepository(prisma);
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Validate patient data before creation
   */
  private validateCreateData(data: CreatePatientDTO): void {
    const errors: any[] = [];

    if (!data.surname || data.surname.trim().length === 0) {
      errors.push({ field: 'surname', message: 'Surname is required' });
    }

    if (!data.otherNames || data.otherNames.trim().length === 0) {
      errors.push({ field: 'otherNames', message: 'Other names are required' });
    }

    if (!data.dateOfBirth) {
      errors.push({ field: 'dateOfBirth', message: 'Date of birth is required' });
    } else {
      const dob = new Date(data.dateOfBirth);
      if (dob > new Date()) {
        errors.push({ field: 'dateOfBirth', message: 'Date of birth cannot be in the future' });
      }
    }

    if (!data.gender) {
      errors.push({ field: 'gender', message: 'Gender is required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

/**
 * Check for duplicate patient
 */
private async checkDuplicates(data: CreatePatientDTO, excludeId?: string): Promise<void> {
  // 1. Check NHIS Number (unique)
  if (data.nhisNumber) {
    const existingByNHIS = await this.repository.findByNHISNumber(data.nhisNumber);
    if (existingByNHIS && (!excludeId || existingByNHIS.id !== excludeId)) {
      throw new ValidationError('A patient with this NHIS number already exists', [
        { field: 'nhisNumber', message: 'NHIS number already registered', code: 'DUPLICATE' }
      ]);
    }
  }

  // 2. Check Insurance Number (for private insurance) - unique
  if (data.insuranceDetails?.insuranceNumber) {
    const existingByInsuranceNumber = await this.repository.findByInsuranceNumber(
      data.insuranceDetails.insuranceNumber
    );
    if (existingByInsuranceNumber && (!excludeId || existingByInsuranceNumber.id !== excludeId)) {
      throw new ValidationError('A patient with this insurance number already exists', [
        { field: 'insuranceNumber', message: 'Insurance number already registered', code: 'DUPLICATE' }
      ]);
    }
  }

  // 3. Check Corporate Employee ID (when linked to corporate account) - unique
  if (data.corporateEmployeeId) {
    const existingByCorporateEmployee = await this.repository.findByCorporateEmployeeId(
      data.corporateEmployeeId
    );
    if (existingByCorporateEmployee && (!excludeId || existingByCorporateEmployee.id !== excludeId)) {
      throw new ValidationError('A patient with this corporate employee ID already exists', [
        { field: 'corporateEmployeeId', message: 'Corporate employee ID already registered', code: 'DUPLICATE' }
      ]);
    }
  }

  // 4. Check Contact/Phone - NOT unique (family members can share)
  // Skip contact uniqueness check - multiple patients can have same phone number

  // 5. Check Folder Number - unique
  if (data.folderNumber) {
    const existingByFolder = await this.repository.findByFolderNumber(data.folderNumber);
    if (existingByFolder && (!excludeId || existingByFolder.id !== excludeId)) {
      throw new ValidationError('A patient with this folder number already exists', [
        { field: 'folderNumber', message: 'Folder number already exists', code: 'DUPLICATE' }
      ]);
    }
  }
}

  /**
   * Validate corporate account if payment mode is corporate
   */
  private async validateCorporateData(data: CreatePatientDTO): Promise<void> {
    if (data.paymentMode === 'corporate') {
      if (!data.corporateAccountId && !data.insuranceProviderId) {
        throw new ValidationError('Corporate account required for corporate payment mode', [
          { field: 'corporateAccountId', message: 'Corporate account ID is required', code: 'MISSING_CORPORATE' }
        ]);
      }

      // Verify corporate account exists
      const corporateAccount = await this.prisma.corporateAccount.findUnique({
        where: { id: data.corporateAccountId || data.insuranceProviderId }
      });

      if (!corporateAccount) {
        throw new ValidationError('Corporate account not found', [
          { field: 'corporateAccountId', message: 'Invalid corporate account ID', code: 'INVALID_CORPORATE' }
        ]);
      }

      if (!corporateAccount.isActive) {
        throw new ValidationError('Corporate account is inactive', [
          { field: 'corporateAccountId', message: 'Corporate account is not active', code: 'INACTIVE_CORPORATE' }
        ]);
      }

      this.logInfo('Corporate account validated', { 
        corporateAccountId: corporateAccount.id,
        companyName: corporateAccount.companyName 
      });
    }
  }

  /**
   * Create a new patient
   */
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
    
    this.logInfo('Patient created successfully', { 
      patientId: patient.id, 
      folderNumber: patient.folderNumber,
      paymentMode: patient.paymentMode
    });

    return patient;
  }

  /**
   * Get patient by ID
   */
  async getPatientById(id: string, include?: any): Promise<Patient> {
    this.logDebug('Fetching patient by ID', { id });

    const patient = await this.repository.findById(id, include);

    if (!patient) {
      throw new NotFoundError('Patient', id);
    }

    return patient;
  }

  /**
   * Get patient by NHIS number
   */
  async getPatientByNHISNumber(nhisNumber: string): Promise<Patient> {
    this.logDebug('Fetching patient by NHIS number', { nhisNumber });

    const patient = await this.repository.findByNHISNumber(nhisNumber);

    if (!patient) {
      throw new NotFoundError('Patient', `NHIS:${nhisNumber}`);
    }

    return patient;
  }

  /**
   * Get patient by folder number
   */
  async getPatientByFolderNumber(folderNumber: string): Promise<Patient> {
    this.logDebug('Fetching patient by folder number', { folderNumber });

    const patient = await this.repository.findByFolderNumber(folderNumber);

    if (!patient) {
      throw new NotFoundError('Patient', `Folder:${folderNumber}`);
    }

    return patient;
  }

  /**
   * Search patients with filters
   */
  async searchPatients(filters: PatientFilters) {
    this.logInfo('Searching patients', { filters });

    const result = await this.repository.search(filters);

    return {
      data: result.data.map(p => ({
        ...p,
        age: this.calculateAge(p.dateOfBirth),
        fullName: `${p.surname} ${p.otherNames || ''}`.trim()
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    };
  }

  /**
   * Update patient
   */
  async updatePatient(id: string, data: UpdatePatientDTO): Promise<Patient> {
    this.logInfo('Updating patient', { id });
  
    // Verify patient exists
    await this.getPatientById(id);
  
    // ✅ Always check duplicates for unique fields when updating
    await this.checkDuplicates(data as CreatePatientDTO, id);
  
    // Handle date conversion
    const updateData = {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined
    };
  
    const patient = await this.repository.update(id, updateData);
  
    this.logInfo('Patient updated successfully', { id });
  
    return patient;
  }

  /**
   * Delete patient
   */
  async deletePatient(id: string): Promise<void> {
    this.logInfo('Deleting patient', { id });

    // Verify patient exists
    await this.getPatientById(id);

    // Check for related records (attendances, bills, etc.)
    const hasRelatedRecords = await this.repository.hasRelatedRecords(id);
    
    if (hasRelatedRecords) {
      throw new ValidationError('Cannot delete patient with existing records', [
        { field: 'id', message: 'Patient has associated records. Consider deactivating instead.', code: 'HAS_RELATIONS' }
      ]);
    }

    await this.repository.delete(id);

    this.logInfo('Patient deleted successfully', { id });
  }

  /**
   * Get patient statistics
   */
  async getPatientStats() {
    this.logInfo('Fetching patient statistics');
    return this.repository.getStats();
  }

/**
 * Get patient summary list
 */
async getPatientSummaries(limit: number = 10): Promise<PatientSummary[]> {
  const patients = await this.repository.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      Attendance: {  // ✅ FIXED: Changed from 'attendances' to 'Attendance'
        orderBy: { dateTime: 'desc' },
        take: 1,
        select: { dateTime: true }
      }
    }
  });

  return patients.map(p => ({
    id: p.id,
    folderNumber: p.folderNumber,
    fullName: `${p.surname} ${p.otherNames || ''}`.trim(),
    age: this.calculateAge(p.dateOfBirth),
    gender: p.gender,
    nhisNumber: p.nhisNumber || undefined,
    contact: p.contact,
    registeredAt: p.registeredAt,
    lastVisit: p.Attendance[0]?.dateTime || undefined  // ✅ FIXED: Changed from 'attendances' to 'Attendance'
  }));
}

  /**
   * Get patients by corporate account
   */
  async getPatientsByCorporateAccount(corporateAccountId: string, page: number = 1, limit: number = 10) {
    this.logInfo('Fetching patients by corporate account', { corporateAccountId });
    
    const result = await this.repository.search({
      corporateAccountId,
      page,
      limit
    });

    return {
      data: result.data.map(p => ({
        ...p,
        age: this.calculateAge(p.dateOfBirth),
        fullName: `${p.surname} ${p.otherNames || ''}`.trim()
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    };
  }

  /**
   * Get corporate account summary for a patient
   */
  async getPatientCorporateSummary(patientId: string): Promise<any> {
    const patient = await this.getPatientById(patientId, {
      insuranceProvider: true
    });

    if (patient.paymentMode !== 'corporate') {
      return { isCorporate: false, paymentMode: patient.paymentMode };
    }

    const corporateAccount = await this.prisma.corporateAccount.findUnique({
      where: { id: patient.insuranceProviderId! },
      include: {
        employees: {
          where: { isActive: true },
          select: { id: true, employeeId: true, firstName: true, lastName: true }
        }
      }
    });

    return {
      isCorporate: true,
      paymentMode: 'corporate',
      corporateAccount: {
        id: corporateAccount?.id,
        companyName: corporateAccount?.companyName,
        creditLimit: corporateAccount?.creditLimit,
        currentBalance: corporateAccount?.currentBalance
      }
    };
  }
}