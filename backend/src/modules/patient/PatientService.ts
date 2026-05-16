/**
 * Patient Service
 * Business logic layer for Patient operations
 */

import { PrismaClient, Patient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { PatientRepository } from './PatientRepository';
import { CreatePatientDTO, UpdatePatientDTO, PatientFilters, PatientSummary } from './PatientTypes';
import { NotFoundError, ValidationError } from '../../utils/errors';

export class PatientService extends BaseService {
  private repository: PatientRepository;

  constructor(prisma: PrismaClient) {
    super('PatientService');
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
   * Generate patient ID
   */
  private generatePatientId(): string {
    const prefix = 'PAT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }

  /**
   * Validate patient data before creation
   */
  private validateCreateData(data: CreatePatientDTO): void {
    const errors: any[] = [];

    if (!data.firstName || data.firstName.trim().length === 0) {
      errors.push({ field: 'firstName', message: 'First name is required' });
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      errors.push({ field: 'lastName', message: 'Last name is required' });
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
    const conditions: any[] = [];

    if (data.nhisNumber) {
      const existingByNHIS = await this.repository.findByNHISNumber(data.nhisNumber);
      if (existingByNHIS && (!excludeId || existingByNHIS.id !== excludeId)) {
        throw new ValidationError('A patient with this NHIS number already exists', [
          { field: 'nhisNumber', message: 'NHIS number already registered', code: 'DUPLICATE' }
        ]);
      }
    }

    if (data.phone) {
      const existingByPhone = await this.repository.findByPhone(data.phone);
      if (existingByPhone && (!excludeId || existingByPhone.id !== excludeId)) {
        throw new ValidationError('A patient with this phone number already exists', [
          { field: 'phone', message: 'Phone number already registered', code: 'DUPLICATE' }
        ]);
      }
    }

    if (data.email) {
      const existingByEmail = await this.repository.findByEmail(data.email);
      if (existingByEmail && (!excludeId || existingByEmail.id !== excludeId)) {
        throw new ValidationError('A patient with this email already exists', [
          { field: 'email', message: 'Email already registered', code: 'DUPLICATE' }
        ]);
      }
    }
  }

  /**
   * Create a new patient
   */
  async createPatient(data: CreatePatientDTO): Promise<Patient> {
    this.logInfo('Creating new patient', { nhisNumber: data.nhisNumber });
    
    this.validateCreateData(data);
    await this.checkDuplicates(data);

    const patientData = {
      ...data,
      patientId: this.generatePatientId(),
      dateOfBirth: new Date(data.dateOfBirth)
    };

    const patient = await this.repository.create(patientData);
    
    this.logInfo('Patient created successfully', { 
      patientId: patient.id, 
      patientCode: patient.patientId 
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
   * Search patients with filters
   */
  async searchPatients(filters: PatientFilters) {
    this.logInfo('Searching patients', { filters });

    const result = await this.repository.search(filters);

    return {
      data: result.data.map(p => ({
        ...p,
        age: this.calculateAge(p.dateOfBirth),
        fullName: `${p.firstName} ${p.otherName || ''} ${p.lastName}`.trim()
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

    // Check for duplicates if updating sensitive fields
    if (data.nhisNumber || data.phone || data.email) {
      await this.checkDuplicates(data as CreatePatientDTO, id);
    }

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

    // TODO: Check for related records (attendances, bills, etc.)
    // For now, we'll just delete

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
      orderBy: { createdAt: 'desc' }
    });

    return patients.map(p => ({
      id: p.id,
      patientId: p.patientId,
      fullName: `${p.firstName} ${p.otherName || ''} ${p.lastName}`.trim(),
      age: this.calculateAge(p.dateOfBirth),
      gender: p.gender,
      nhisNumber: p.nhisNumber || undefined,
      phone: p.phone || undefined,
      lastVisit: undefined // TODO: Fetch from attendances
    }));
  }
}
