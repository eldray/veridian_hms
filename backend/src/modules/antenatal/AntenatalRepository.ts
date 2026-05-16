// modules/antenatal/AntenatalRepository.ts
import { PrismaClient } from '@prisma/client';
import { 
  AntenatalBooking, 
  ANCVisit, 
  DeliveryRecord, 
  PostnatalRecord,
  CreateAntenatalBookingInput,
  UpdateAntenatalBookingInput,
  CreateANCVisitInput,
  UpdateANCVisitInput,
  CreateDeliveryRecordInput,
  CreatePostnatalRecordInput
} from './AntenatalTypes';

export class AntenatalRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ===================== ANTENATAL BOOKING =====================
  
  async createBooking(data: CreateAntenatalBookingInput): Promise<any> {
    const bookingNumber = `ANC${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    return this.prisma.antenatalBooking.create({
      data: {
        ...data,
        bookingNumber,
        edd: this.calculateEDD(data.lmp),
        isActive: true,
        isCompleted: false
      },
      include: { patient: true }
    });
  }

  async getBookingById(id: string): Promise<any | null> {
    return this.prisma.antenatalBooking.findUnique({
      where: { id },
      include: {
        patient: true,
        visits: { orderBy: { visitNumber: 'asc' } }
      }
    });
  }

  async getBookingByAttendanceId(attendanceId: string): Promise<any | null> {
    return this.prisma.antenatalBooking.findFirst({
      where: { attendanceId },
      include: {
        patient: true,
        visits: { orderBy: { visitNumber: 'asc' } }
      }
    });
  }

  async getActiveBookingByPatientId(patientId: string): Promise<any | null> {
    let booking = await this.prisma.antenatalBooking.findFirst({
      where: { patientId, isActive: true, isCompleted: false },
      include: {
        patient: true,
        visits: { orderBy: { visitNumber: 'asc' } }
      }
    });

    if (!booking) {
      booking = await this.prisma.antenatalBooking.findFirst({
        where: { patientId },
        orderBy: { bookingDate: 'desc' },
        include: {
          patient: true,
          visits: { orderBy: { visitNumber: 'asc' } }
        }
      });
    }

    return booking;
  }

  async getAllBookings(filters: {
    isActive?: boolean;
    patientId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ bookings: any[]; total: number }> {
    const { isActive, patientId, page = 1, limit = 50 } = filters;
    const where: any = {};
    
    if (isActive !== undefined) where.isActive = isActive;
    if (patientId) where.patientId = patientId;

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.antenatalBooking.findMany({
        where,
        include: { 
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } },
          _count: { select: { visits: true } }
        },
        orderBy: { bookingDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.antenatalBooking.count({ where })
    ]);

    return { bookings, total };
  }

  async updateBooking(id: string, data: UpdateAntenatalBookingInput): Promise<any> {
    return this.prisma.antenatalBooking.update({
      where: { id },
      data,
      include: { patient: true }
    });
  }

  async closeBooking(id: string, deliveryData: {
    deliveryDate?: Date;
    deliveryOutcome?: string;
    deliveryRecordId?: string;
  }): Promise<any> {
    return this.prisma.antenatalBooking.update({
      where: { id },
      data: {
        isActive: false,
        isCompleted: true,
        deliveryDate: deliveryData.deliveryDate || new Date(),
        deliveryOutcome: deliveryData.deliveryOutcome || 'delivered',
        deliveryRecordId: deliveryData.deliveryRecordId,
        updatedAt: new Date()
      },
      include: { patient: true }
    });
  }

  async deleteBooking(id: string): Promise<void> {
    await this.prisma.antenatalBooking.delete({ where: { id } });
  }

  // ===================== ANC VISITS =====================

  async createVisit(data: CreateANCVisitInput): Promise<any> {
    return this.prisma.aNCVisit.create({
      data,
      include: { recordedBy: { select: { fullName: true, role: true } } }
    });
  }

  async getVisitsByBookingId(bookingId: string): Promise<any[]> {
    return this.prisma.aNCVisit.findMany({
      where: { bookingId },
      orderBy: { visitNumber: 'asc' },
      include: { 
        recordedBy: { select: { fullName: true, role: true } },
        booking: { include: { patient: true } }
      }
    });
  }

  async getVisitById(id: string): Promise<any | null> {
    return this.prisma.aNCVisit.findUnique({
      where: { id },
      include: {
        booking: { include: { patient: true } },
        recordedBy: { select: { fullName: true, role: true } }
      }
    });
  }

  async updateVisit(id: string, data: UpdateANCVisitInput): Promise<any> {
    return this.prisma.aNCVisit.update({
      where: { id },
      data,
      include: { recordedBy: { select: { fullName: true, role: true } } }
    });
  }

  async deleteVisit(id: string): Promise<void> {
    await this.prisma.aNCVisit.delete({ where: { id } });
  }

  // ===================== DELIVERY RECORDS =====================

  async createDeliveryRecord(data: CreateDeliveryRecordInput): Promise<any> {
    return this.prisma.deliveryRecord.create({
      data,
      include: {
        patient: true,
        attendance: true,
        Newborn: true
      }
    });
  }

  async getDeliveryRecords(filters: {
    patientId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ records: any[]; total: number }> {
    const { patientId, startDate, endDate, page = 1, limit = 50 } = filters;
    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (startDate || endDate) {
      where.deliveryDate = {};
      if (startDate) where.deliveryDate.gte = startDate;
      if (endDate) where.deliveryDate.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.deliveryRecord.findMany({
        where,
        include: {
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
          attendance: { select: { attendanceNumber: true, dateTime: true } },
          Newborn: true,
          antenatalBooking: { select: { id: true, gravida: true, para: true } }
        },
        orderBy: { deliveryDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.deliveryRecord.count({ where })
    ]);

    return { records, total };
  }

  async getDeliveryRecordById(id: string): Promise<any | null> {
    return this.prisma.deliveryRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
        attendance: { select: { attendanceNumber: true, dateTime: true } },
        Newborn: true,
        antenatalBooking: { select: { id: true, gravida: true, para: true, edd: true } }
      }
    });
  }

  async updateDeliveryRecord(id: string, data: any): Promise<any> {
    return this.prisma.deliveryRecord.update({
      where: { id },
      data,
      include: { Newborn: true }
    });
  }

  async deleteDeliveryRecord(id: string): Promise<void> {
    await this.prisma.deliveryRecord.delete({ where: { id } });
  }

  // ===================== POSTNATAL RECORDS =====================

  async createPostnatalRecord(data: CreatePostnatalRecordInput): Promise<any> {
    return this.prisma.postnatalRecord.create({
      data,
      include: {
        patient: true,
        deliveryRecord: true
      }
    });
  }

  async getPostnatalRecords(filters: {
    patientId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ records: any[]; total: number }> {
    const { patientId, page = 1, limit = 50 } = filters;
    const where: any = {};

    if (patientId) where.patientId = patientId;

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.postnatalRecord.findMany({
        where,
        include: {
          patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
          deliveryRecord: true
        },
        orderBy: { registrationDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.postnatalRecord.count({ where })
    ]);

    return { records, total };
  }

  async getPostnatalRecordById(id: string): Promise<any | null> {
    return this.prisma.postnatalRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
        deliveryRecord: true
      }
    });
  }

  async updatePostnatalRecord(id: string, data: any): Promise<any> {
    return this.prisma.postnatalRecord.update({
      where: { id },
      data
    });
  }

  async deletePostnatalRecord(id: string): Promise<void> {
    await this.prisma.postnatalRecord.delete({ where: { id } });
  }

  // ===================== STATISTICS =====================

  async getANCStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.bookingDate = {};
      if (startDate) where.bookingDate.gte = startDate;
      if (endDate) where.bookingDate.lte = endDate;
    }

    const visitWhere: any = {};
    if (startDate || endDate) {
      visitWhere.visitDate = {};
      if (startDate) visitWhere.visitDate.gte = startDate;
      if (endDate) visitWhere.visitDate.lte = endDate;
    }

    const [totalBookings, activeBookings, highRiskBookings, totalVisits, iptpDosesGiven, ttDosesGiven] = await Promise.all([
      this.prisma.antenatalBooking.count({ where }),
      this.prisma.antenatalBooking.count({ where: { ...where, isActive: true } }),
      this.prisma.antenatalBooking.count({ where: { ...where, riskLevel: 'high' } }),
      this.prisma.aNCVisit.count({ where: visitWhere }),
      this.prisma.aNCVisit.count({ where: { ...visitWhere, iptpGiven: true } }),
      this.prisma.aNCVisit.count({ where: { ...visitWhere, ttGiven: true } })
    ]);

    return {
      totalBookings,
      activeBookings,
      highRiskBookings,
      totalVisits,
      iptpDosesGiven,
      ttDosesGiven,
      averageVisitsPerBooking: totalBookings > 0 ? totalVisits / totalBookings : 0
    };
  }

  async getDeliveryStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.deliveryDate = {};
      if (startDate) where.deliveryDate.gte = startDate;
      if (endDate) where.deliveryDate.lte = endDate;
    }

    const [totalDeliveries, liveBirths, stillbirths, cesareanSections, vaginalDeliveries] = await Promise.all([
      this.prisma.deliveryRecord.count({ where }),
      this.prisma.deliveryRecord.count({ where: { ...where, deliveryOutcome: 'live_birth' } }),
      this.prisma.deliveryRecord.count({ where: { ...where, deliveryOutcome: 'stillbirth' } }),
      this.prisma.deliveryRecord.count({ where: { ...where, deliveryType: 'cesarean_section' } }),
      this.prisma.deliveryRecord.count({ where: { deliveryType: { in: ['spontaneous_vaginal', 'assisted_vaginal'] } } })
    ]);

    const complications = await this.prisma.deliveryRecord.count({
      where: { ...where, complications: { not: null } }
    });

    return {
      totalDeliveries,
      liveBirths,
      stillbirths,
      cesareanSections,
      vaginalDeliveries,
      complications
    };
  }

  async getPostnatalStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.registrationDate = {};
      if (startDate) where.registrationDate.gte = startDate;
      if (endDate) where.registrationDate.lte = endDate;
    }

    const [totalRecords, stableMothers, stableNewborns, exclusiveBreastfeeding] = await Promise.all([
      this.prisma.postnatalRecord.count({ where }),
      this.prisma.postnatalRecord.count({ where: { ...where, maternalCondition: 'stable' } }),
      this.prisma.postnatalRecord.count({ where: { ...where, newbornCondition: 'stable' } }),
      this.prisma.postnatalRecord.count({ where: { ...where, breastfeedingStatus: 'exclusive' } })
    ]);

    return {
      totalRecords,
      stableMothers,
      stableNewborns,
      exclusiveBreastfeeding
    };
  }

  // ===================== HELPER METHODS =====================

  private calculateEDD(lmp: Date): Date {
    // Naegele's rule: LMP + 280 days (40 weeks)
    const edd = new Date(lmp);
    edd.setDate(edd.getDate() + 280);
    return edd;
  }
}
