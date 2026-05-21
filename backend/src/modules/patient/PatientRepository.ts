// modules/patient/PatientRepository.ts
import { PrismaClient, Patient } from '@prisma/client';
import { BaseRepository, PaginationResult } from '../../shared/base/BaseRepository';
import { CreatePatientDTO, UpdatePatientDTO, PatientFilters } from './PatientTypes';

export class PatientRepository extends BaseRepository<Patient, CreatePatientDTO, UpdatePatientDTO> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'patient');
  }

  async findByNHISNumber(nhisNumber: string, include?: any): Promise<Patient | null> {
    return this.getModel().findFirst({
      where: { nhisNumber },
      include
    });
  }

  async findByPhone(phone: string, include?: any): Promise<Patient | null> {
    return this.getModel().findFirst({
      where: { contact: phone },
      include
    });
  }

  async findByFolderNumber(folderNumber: string, include?: any): Promise<Patient | null> {
    return this.getModel().findUnique({
      where: { folderNumber },
      include
    });
  }

  async findByCorporateAccount(corporateAccountId: string, include?: any): Promise<Patient[]> {
    return this.getModel().findMany({
      where: { 
        insuranceProviderId: corporateAccountId,
        paymentMode: 'corporate'
      },
      include
    });
  }

  async search(filters: PatientFilters): Promise<PaginationResult<Patient>> {
    const { 
      search, 
      nhisNumber, 
      phone, 
      gender, 
      paymentMode,
      corporateAccountId,
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 10 
    } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { surname: { contains: search, mode: 'insensitive' } },
        { otherNames: { contains: search, mode: 'insensitive' } },
        { folderNumber: { contains: search, mode: 'insensitive' } },
        { nhisNumber: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (nhisNumber) {
      where.nhisNumber = { contains: nhisNumber, mode: 'insensitive' };
    }

    if (phone) {
      where.contact = { contains: phone, mode: 'insensitive' };
    }

    if (gender) {
      where.gender = gender;
    }

    if (paymentMode) {
      where.paymentMode = paymentMode;
    }

    if (corporateAccountId) {
      where.insuranceProviderId = corporateAccountId;
      where.paymentMode = 'corporate';
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
      orderBy: { createdAt: 'desc' },
      include: {
        InsuranceProvider: {
          select: { id: true, name: true, type: true }
        }
      }
    });
  }

  async getStats(): Promise<{
    totalPatients: number;
    maleCount: number;
    femaleCount: number;
    otherCount: number;
    newThisMonth: number;
    byPaymentMode: { mode: string; count: number }[];
  }> {
    const [totalPatients, maleCount, femaleCount, otherCount, newThisMonth] = await Promise.all([
      this.count(),
      this.count({ gender: 'male' }),
      this.count({ gender: 'female' }),
      this.count({ gender: 'other' }),
      this.count({
        createdAt: {
          gte: new Date(new Date().setDate(1))
        }
      })
    ]);

    const paymentModeStats = await this.prisma.patient.groupBy({
      by: ['paymentMode'],
      _count: { id: true },
      where: { paymentMode: { not: null } }
    });

    const byPaymentMode = paymentModeStats.map(stat => ({
      mode: stat.paymentMode as string,
      count: stat._count.id
    }));

    return {
      totalPatients,
      maleCount,
      femaleCount,
      otherCount,
      newThisMonth,
      byPaymentMode
    };
  }

  // ✅ FIXED: Use correct relation names (singular, capital letters)
  async hasRelatedRecords(id: string): Promise<boolean> {
    const [attendanceCount, billCount, admissionCount, insuranceClaimCount] = await Promise.all([
      this.prisma.attendance.count({ where: { patientId: id } }),      // ✅ attendance (singular)
      this.prisma.bill.count({ where: { patientId: id } }),            // ✅ bill (singular)
      this.prisma.admission.count({ where: { patientId: id } }),       // ✅ admission (singular)
      this.prisma.insuranceClaim.count({ where: { patientId: id } })   // ✅ insuranceClaim (singular)
    ]);
    
    return attendanceCount > 0 || billCount > 0 || admissionCount > 0 || insuranceClaimCount > 0;
  }
}