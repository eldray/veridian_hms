/**
 * Patient Repository
 * Data access layer for Patient entity
 */

import { PrismaClient, Patient, Gender } from '@prisma/client';
import { BaseRepository, FindManyOptions, PaginationResult } from '../../shared/base/BaseRepository';
import { CreatePatientDTO, UpdatePatientDTO, PatientFilters } from './PatientTypes';

export class PatientRepository extends BaseRepository<Patient, CreatePatientDTO, UpdatePatientDTO> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'patient');
  }

  /**
   * Find patient by NHIS number
   */
  async findByNHISNumber(nhisNumber: string, include?: any): Promise<Patient | null> {
    return this.getModel().findUnique({
      where: { nhisNumber },
      include
    });
  }

  /**
   * Find patient by phone number
   */
  async findByPhone(phone: string, include?: any): Promise<Patient | null> {
    return this.getModel().findFirst({
      where: { phone },
      include
    });
  }

  /**
   * Find patient by email
   */
  async findByEmail(email: string, include?: any): Promise<Patient | null> {
    return this.getModel().findUnique({
      where: { email },
      include
    });
  }

  /**
   * Search patients with filters
   */
  async search(filters: PatientFilters): Promise<PaginationResult<Patient>> {
    const { 
      search, 
      nhisNumber, 
      phone, 
      email, 
      gender, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 10 
    } = filters;

    const where: any = {};

    // Build search conditions
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { otherName: { contains: search, mode: 'insensitive' } },
        { patientId: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (nhisNumber) {
      where.nhisNumber = { contains: nhisNumber, mode: 'insensitive' };
    }

    if (phone) {
      where.phone = { contains: phone, mode: 'insensitive' };
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (gender) {
      where.gender = gender;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    return this.findManyWithPagination({
      where,
      page,
      limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get patient statistics
   */
  async getStats(): Promise<{
    totalPatients: number;
    maleCount: number;
    femaleCount: number;
    newThisMonth: number;
  }> {
    const [totalPatients, maleCount, femaleCount, newThisMonth] = await Promise.all([
      this.count(),
      this.count({ gender: Gender.Male }),
      this.count({ gender: Gender.Female }),
      this.count({
        createdAt: {
          gte: new Date(new Date().setDate(1)) // First day of current month
        }
      })
    ]);

    return {
      totalPatients,
      maleCount,
      femaleCount,
      newThisMonth
    };
  }
}
