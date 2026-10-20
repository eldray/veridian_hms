import { PrismaClient, Patient } from '@prisma/client';
import { BaseRepository, PaginationResult } from '../../shared/base/BaseRepository';
import { CreatePatientDTO, UpdatePatientDTO, PatientFilters, CreateAllergyDTO, CreateMedicalHistoryDTO } from './PatientTypes';

export class PatientRepository extends BaseRepository<Patient, CreatePatientDTO, UpdatePatientDTO> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'patient');
  }

  async findByNHISNumber(nhisNumber: string, include?: any): Promise<Patient | null> {
    return this.getModel().findFirst({ where: { nhisNumber }, include });
  }

  async findByInsuranceNumber(insuranceNumber: string): Promise<Patient | null> {
    return this.getModel().findFirst({
      where: {
        insuranceDetails: { path: ['insuranceNumber'], equals: insuranceNumber }
      }
    });
  }

  // ✅ ADDED: Required by Service.checkDuplicates
  async findByCorporateEmployeeId(employeeId: string): Promise<any | null> {
    return this.prisma.corporateEmployee.findFirst({ where: { employeeId } });
  }

  async findByPhone(phone: string, include?: any): Promise<Patient | null> {
    return this.getModel().findFirst({ where: { contact: phone }, include });
  }

  async findByFolderNumber(folderNumber: string, include?: any): Promise<Patient | null> {
    return this.getModel().findUnique({ where: { folderNumber }, include });
  }

  async findByCorporateAccount(corporateAccountId: string, include?: any): Promise<Patient[]> {
    return this.getModel().findMany({
      where: {
        paymentMode: 'corporate',
        OR: [
          { employer: { path: ['corporateAccountId'], equals: corporateAccountId } },
          { insuranceProviderId: corporateAccountId }
        ]
      },
      include
    });
  }

  async search(filters: PatientFilters): Promise<PaginationResult<Patient>> {
    const { nhisNumber, phone, gender, paymentMode, corporateAccountId, dateFrom, dateTo } = filters;
    const search = filters.search?.trim();
    // Default 20, hard maximum 100 (the controller also enforces 100).
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const where: any = {};

    // ILIKE '%text%' is served by the pg_trgm GIN indexes (prisma/sql/001_patient_search_indexes.sql).
    // Trigram indexes need 3+ characters, so 1-2 character searches fall back to a slower scan.
    if (search) {
      where.OR = [
        { surname: { contains: search, mode: 'insensitive' } },
        { otherNames: { contains: search, mode: 'insensitive' } },
        { folderNumber: { contains: search, mode: 'insensitive' } },
        { nhisNumber: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (nhisNumber) where.nhisNumber = { contains: nhisNumber, mode: 'insensitive' };
    if (phone) where.contact = { contains: phone, mode: 'insensitive' };
    if (gender) where.gender = gender;
    if (paymentMode) where.paymentMode = paymentMode;
    if (corporateAccountId) {
      where.paymentMode = 'corporate';
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { employer: { path: ['corporateAccountId'], equals: corporateAccountId } },
            { insuranceProviderId: corporateAccountId }
          ]
        }
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    return this.findManyWithPagination({
      where, page, limit,
      orderBy: { createdAt: 'desc' },
      include: { InsuranceProvider: { select: { id: true, name: true, type: true } } }
    });
  }

  async getStats() {
    const [totalPatients, maleCount, femaleCount, otherCount, newThisMonth] = await Promise.all([
      this.count(),
      this.count({ gender: 'male' }),
      this.count({ gender: 'female' }),
      this.count({ gender: 'other' }),
      this.count({ createdAt: { gte: new Date(new Date().setDate(1)) } })
    ]);

    const paymentModeStats = await this.prisma.patient.groupBy({
      by: ['paymentMode'], _count: { id: true }, where: { paymentMode: { not: null } }
    });

    return {
      totalPatients, maleCount, femaleCount, otherCount, newThisMonth,
      byPaymentMode: paymentModeStats.map(stat => ({ mode: stat.paymentMode as string, count: stat._count.id }))
    };
  }

  // ✅ FIXED: Changed 'admission' to 'appointment' because Admission has no patientId
  async hasRelatedRecords(id: string): Promise<boolean> {
    const [attendanceCount, billCount, appointmentCount, insuranceClaimCount] = await Promise.all([
      this.prisma.attendance.count({ where: { patientId: id } }),
      this.prisma.bill.count({ where: { patientId: id } }),
      this.prisma.appointment.count({ where: { patientId: id } }), 
      this.prisma.insuranceClaim.count({ where: { patientId: id } })
    ]);
    
    return attendanceCount > 0 || billCount > 0 || appointmentCount > 0 || insuranceClaimCount > 0;
  }

  // ==========================================
  // NEW: EMR (Allergies & Histories) Methods
  // ==========================================

  async createAllergy(patientId: string, data: CreateAllergyDTO) {
    return this.prisma.patientAllergy.create({ data: { ...data, patientId } });
  }

  async findAllergies(patientId: string) {
    return this.prisma.patientAllergy.findMany({ where: { patientId }, orderBy: { id: 'desc' } });
  }

  async createMedicalHistory(patientId: string, data: CreateMedicalHistoryDTO) {
    return this.prisma.patientMedicalHistory.create({ 
      data: { ...data, patientId, diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : undefined } 
    });
  }

  async findMedicalHistories(patientId: string) {
    return this.prisma.patientMedicalHistory.findMany({ where: { patientId }, orderBy: [{ diagnosedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }] });
  }
}