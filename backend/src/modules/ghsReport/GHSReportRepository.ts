// src/modules/ghsReport/GHSReportRepository.ts - COMPLETE FIXED VERSION
import { FP_COMMODITIES } from './fpReturns';
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class GHSReportRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'gHSReportSubmission');
  }

  // ── Submissions ───────────────────────────────────────────────────────────
  async createSubmission(data: any) {
    return await this.create(data);
  }

  async findSubmissions(where?: any) {
    return await this.findMany({
      where,
      include: { createdBy: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findSubmissionById(id: string) {
    return await this.findById(id, { createdBy: { select: { fullName: true, username: true } } });
  }

  // ── Facility Info ─────────────────────────────────────────────────────────
  async getFacility() {
    return this.prisma.hospital.findFirst();
  }

  // ── Delivery Report Data ──────────────────────────────────────────────────
  async getDeliveryData(startDate: Date, endDate: Date) {
    return this.prisma.deliveryRecord.findMany({
      where: {
        deliveryDate: { gte: startDate, lte: endDate },
      },
      include: {
        patient: { select: { dateOfBirth: true, gender: true, folderNumber: true } },
        attendance: { select: { paymentMode: true, attendanceNumber: true } },
        Newborn: true,
        antenatalBooking: true,
      },
      orderBy: { deliveryDate: 'asc' },
    });
  }

  // ── ✅ FIXED: Family Planning Report Data ──────────────────────────────
  async getFPData(startDate: Date, endDate: Date) {
    const fpAttendances = await this.prisma.familyPlanningService.findMany({
      where: {
        serviceDate: { gte: startDate, lte: endDate },
        OR: [{ attendanceId: null }, { attendance: { is: { status: { not: 'cancelled' } } } }],
      },
      include: {
        patient: {
          select: {
            id: true,
            dateOfBirth: true,
            gender: true,
            folderNumber: true,
          },
        },
        attendance: {
          include: {
            Patient: true,
            ServiceRendered: {
              include: {
                ServiceCatalog: true,
              },
            },
          },
        },
        providedBy: {
          select: { fullName: true, username: true },
        },
      },
    });

    return { fpAttendances };
  }

  // ── Morbidity Report Data ─────────────────────────────────────────────────
  async getMorbidityData(startDate: Date, endDate: Date) {
    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: endDate }, status: { not: 'cancelled' } },
      include: {
        Patient: true,
        AttendanceDiagnosis: { include: { Diagnosis: true } },
        referral: { where: { referralType: 'outgoing' }, select: { id: true } },
      },
    });

    const patientIds = [...new Set(attendances.map(a => a.patientId))];
    const priorRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: { patientId: { in: patientIds }, dateTime: { lt: startDate }, status: { not: 'cancelled' } },
      _count: { id: true },
    });
    const priorDiagnoses = patientIds.length ? await this.prisma.attendanceDiagnosis.findMany({
      where: {
        Attendance: {
          patientId: { in: patientIds },
          dateTime: { lt: startDate },
          status: { not: 'cancelled' },
        },
      },
      select: { diagnosisId: true, Attendance: { select: { patientId: true } } },
    }) : [];

    return { attendances, priorRows, priorDiagnoses };
  }

  // ── Form A Report Data ────────────────────────────────────────────────────
  async getFPReturnsInputs(startDate: Date, endDate: Date) {
    const p = this.prisma as any;
    const keys = FP_COMMODITIES.flatMap(c => c.stockKeys);
    const [services, allItems] = await Promise.all([
      p.familyPlanningService.findMany({
        where: {
          serviceDate: { gte: startDate, lte: endDate },
          OR: [{ attendanceId: null }, { attendance: { is: { status: { not: 'cancelled' } } } }],
        },
        orderBy: { serviceDate: 'asc' },
        include: { patient: { select: { id: true, dateOfBirth: true, gender: true, maritalStatus: true } } },
      }),
      p.stockItem.findMany({ where: { isActive: true }, select: { id: true, name: true, supplier: true, currentStock: true } }),
    ]);
    const stockItems = allItems.filter((i: any) => keys.some(k => String(i.name).toLowerCase().includes(k)));
    const transactions = stockItems.length ? await p.stockTransaction.findMany({
      where: { stockItemId: { in: stockItems.map((i: any) => i.id) }, transactionDate: { lte: endDate } },
      orderBy: { transactionDate: 'asc' },
      select: { stockItemId: true, transactionType: true, quantity: true, balanceAfter: true, transactionDate: true, reference: true, notes: true, Invoice: { select: { supplierName: true } } },
    }) : [];
    return { services, stockItems, transactions };
  }

  async getFormAInputs(startDate: Date, endDate: Date) {
    const p = this.prisma as any;
    const [bookings, visits, deliveries, postnatal, abortions, referrals, labTests, medications, shortMothers, hospital] = await Promise.all([
      p.antenatalBooking.findMany({
        where: {
          bookingDate: { gte: startDate, lte: endDate },
          attendance: { is: { status: { not: 'cancelled' } } },
        },
        include: { patient: { select: { dateOfBirth: true } } },
      }),
      p.aNCVisit.findMany({
        where: {
          visitDate: { gte: startDate, lte: endDate },
          attendance: { is: { status: { not: 'cancelled' } } },
        },
      }),
      p.deliveryRecord.findMany({
        where: {
          deliveryDate: { gte: startDate, lte: endDate },
          attendance: { is: { status: { not: 'cancelled' } } },
        },
        include: {
          Newborn: true,
          patient: { select: { dateOfBirth: true } },
          antenatalBooking: { select: { para: true } },
        },
      }),
      p.postnatalRecord.findMany({
        where: {
          examinationDate: { gte: startDate, lte: endDate },
          attendance: { is: { status: { not: 'cancelled' } } },
        },
        include: {
          patient: { select: { dateOfBirth: true } },
          deliveryRecord: { select: { deliveryDate: true } },
        },
      }),
      p.abortionRecord.findMany({
        where: {
          abortionDate: { gte: startDate, lte: endDate },
          attendance: { is: { status: { not: 'cancelled' } } },
        },
        include: { patient: { select: { dateOfBirth: true } } },
      }),
      p.referralRecord.findMany({
        where: {
          referralDate: { gte: startDate, lte: endDate },
          attendance: {
            is: {
              status: { not: 'cancelled' },
              attendanceType: { in: ['antenatal', 'delivery', 'postnatal'] },
            },
          },
        },
        include: { attendance: { select: { attendanceType: true } }, patient: { select: { dateOfBirth: true } } },
      }),
      p.labTest.findMany({
        where: {
          requestedAt: { gte: startDate, lte: endDate },
          Attendance: {
            is: {
              status: { not: 'cancelled' },
              attendanceType: { in: ['antenatal', 'postnatal'] },
            },
          },
        },
        include: { LabTestTemplate: true },
      }),
      p.medication.findMany({
        where: {
          prescribedAt: { gte: startDate, lte: endDate },
          Attendance: {
            is: {
              status: { not: 'cancelled' },
              attendanceType: { in: ['antenatal', 'postnatal', 'delivery'] },
            },
          },
        },
        include: { StockItem: true },
      }),
      p.vitals.findMany({
        where: {
          recordedAt: { gte: startDate, lte: endDate },
          height: { lt: 150 },
          Attendance: { is: { status: { not: 'cancelled' }, attendanceType: 'antenatal' } },
        },
        distinct: ['patientId'],
        select: { id: true },
      }),
      p.hospital.findFirst(),
    ]);
    return { bookings, visits, deliveries, postnatal, abortions, referrals, labTests, medications, shortMothers: shortMothers.length, hospital };
  }

  async getFormAData(startDate: Date, endDate: Date) {
    return Promise.all([
      this.prisma.antenatalBooking.findMany({ 
        where: { bookingDate: { gte: startDate, lte: endDate }, isActive: true }, 
        include: { patient: { select: { dateOfBirth: true } } } 
      }),
      this.prisma.aNCVisit.findMany({ 
        where: { visitDate: { gte: startDate, lte: endDate } }, 
        include: { booking: { include: { patient: true } } } 
      }),
      this.prisma.deliveryRecord.findMany({ 
        where: { deliveryDate: { gte: startDate, lte: endDate } }, 
        include: { Newborn: true, patient: { select: { dateOfBirth: true } }, attendance: { select: { paymentMode: true } } } 
      }),
      this.prisma.attendance.findMany({ 
        where: { attendanceType: 'postnatal', dateTime: { gte: startDate, lte: endDate }, status: { not: 'cancelled' } }, 
        include: { Patient: { select: { dateOfBirth: true } }, Vitals: true, Medication: true, AttendanceDiagnosis: { include: { Diagnosis: true } } } 
      }),
      this.prisma.attendance.findMany({ 
        where: { attendanceType: 'antenatal', dateTime: { gte: startDate, lte: endDate }, status: { not: 'cancelled' } }, 
        include: { Patient: { select: { dateOfBirth: true } }, Vitals: true, LabTest: { include: { LabTestTemplate: true } }, Medication: { include: { StockItem: true } } } 
      }),
      this.prisma.labTest.findMany({ 
        where: { requestedAt: { gte: startDate, lte: endDate }, Attendance: { attendanceType: { in: ['antenatal', 'postnatal'] } } }, 
        include: { Attendance: { select: { attendanceType: true } }, LabTestTemplate: true } 
      }),
      this.prisma.medication.findMany({ 
        where: { prescribedAt: { gte: startDate, lte: endDate }, Attendance: { attendanceType: { in: ['antenatal', 'postnatal', 'delivery'] } } }, 
        include: { Attendance: { select: { attendanceType: true } }, StockItem: true } 
      }),
      this.prisma.referralRecord.findMany({ 
        where: { 
          referralDate: { gte: startDate, lte: endDate }, 
          attendance: { attendanceType: { in: ['antenatal', 'delivery', 'postnatal'] } } 
        }, 
        include: { 
          attendance: { 
            select: { attendanceType: true, Patient: { select: { dateOfBirth: true } } } 
          }, 
          patient: { select: { dateOfBirth: true } } 
        } 
      }),
      this.prisma.abortionRecord.findMany({ 
        where: { abortionDate: { gte: startDate, lte: endDate } }, 
        include: { patient: { select: { dateOfBirth: true } } } 
      }),
      this.prisma.vitals.findMany({ 
        where: { 
          recordedAt: { gte: startDate, lte: endDate }, 
          height: { lt: 150 }, 
          Attendance: { attendanceType: 'antenatal' } 
        }, 
        distinct: ['patientId'] 
      }),
      this.prisma.hospital.findFirst(),
      this.prisma.newbornRecord.findMany({ 
        where: { deliveryRecord: { deliveryDate: { gte: startDate, lte: endDate } } } 
      })
    ]);
  }

  // ── IPD Report Data ───────────────────────────────────────────────────────
  async getIPDAdmissions(startDate: Date, endDate: Date) {
    return this.prisma.admission.findMany({
      where: { admissionDate: { gte: startDate, lte: endDate } },
      include: { attendance: { include: { Patient: { select: { id: true, dateOfBirth: true, gender: true } }, AttendanceDiagnosis: { include: { Diagnosis: true } } } } },
    });
  }

  // ── Malaria Report Data ───────────────────────────────────────────────────
  async getMalariaData(startDate: Date, endDate: Date) {
    const malariaAttendances = await this.prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDate }, status: { not: 'cancelled' },
        AttendanceDiagnosis: { some: { Diagnosis: { OR: [ { name: { contains: 'malaria', mode: 'insensitive' } }, { name: { contains: 'plasmodium', mode: 'insensitive' } }, { icdCode: { startsWith: 'B50' } }, { icdCode: { startsWith: 'B51' } }, { icdCode: { startsWith: 'B52' } }, { icdCode: { startsWith: 'B53' } }, { icdCode: { startsWith: 'B54' } } ] } } }
      },
      include: { Patient: { select: { dateOfBirth: true, gender: true } }, LabTest: { where: { status: { not: 'cancelled' } }, include: { ServiceCatalog: true } }, Medication: { where: { status: { not: 'cancelled' } }, include: { StockItem: true } } },
    });

    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    const stocks = await this.prisma.malariaCommodityStock.findMany({ where: { reportingMonth: { gte: monthStart, lte: monthEnd } } });

    return { malariaAttendances, stocks };
  }

  // ── OPD Report Data ───────────────────────────────────────────────────────
  async getOPDData(startDate: Date, endDate: Date) {
    const attendances = await this.prisma.attendance.findMany({
      where: { encounterCategory: 'opd', dateTime: { gte: startDate, lte: endDate }, status: { not: 'cancelled' } },
      include: { Patient: { select: { id: true, dateOfBirth: true, gender: true, paymentMode: true, nhisActive: true, nhisExpiryDate: true, nhisNumber: true } } },
    });

    const patientIds = [...new Set(attendances.map(a => a.patientId))];
    const calendarYearStart = new Date(startDate.getFullYear(), 0, 1);
    const priorRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: {
        patientId: { in: patientIds },
        dateTime: { gte: calendarYearStart, lt: startDate },
        status: { not: 'cancelled' },
      },
      _count: { id: true },
    });

    return { attendances, priorRows };
  }

  // ── Top Diagnoses & IDSR Data ─────────────────────────────────────────────
  async getAttendancesWithDiagnoses(startDate: Date, endDate: Date) {
    return this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: endDate }, status: { not: 'cancelled' } },
      include: { Patient: true, AttendanceDiagnosis: { include: { Diagnosis: true } } },
    });
  }

  // ── Consulting Room Register Data ─────────────────────────────────────────
  async getConsultingRoomData(startDate: Date, endDate: Date) {
    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: endDate }, status: { not: 'cancelled' } },
      include: {
        Patient: true, Bill: true,
        AttendanceDiagnosis: { include: { Diagnosis: true }, orderBy: { date: 'asc' } },
        LabTest: { include: { LabTestTemplate: true }, where: { status: { not: 'cancelled' } } },
        Medication: { include: { StockItem: true }, where: { status: { not: 'cancelled' } } },
        referral: { where: { referralType: "outgoing" }, select: { id: true, referredToFacility: true } },
        User_Attendance_createdByIdToUser: { select: { fullName: true } },
        User_Attendance_providerIdToUser: { select: { fullName: true } },
      },
      orderBy: { dateTime: 'asc' },
    });

    const patientIds = [...new Set(attendances.map(a => a.patientId))];
    const calendarYearStart = new Date(startDate.getFullYear(), 0, 1);
    const priorRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: {
        patientId: { in: patientIds },
        dateTime: { gte: calendarYearStart, lt: startDate },
        status: { not: 'cancelled' },
      },
      _count: { id: true },
    });
    const priorDiagnoses = patientIds.length ? await this.prisma.attendanceDiagnosis.findMany({
      where: {
        Attendance: {
          patientId: { in: patientIds },
          dateTime: { lt: startDate },
          status: { not: 'cancelled' },
        },
      },
      select: { diagnosisId: true, Attendance: { select: { patientId: true } } },
    }) : [];

    return { attendances, priorRows, priorDiagnoses };
  }
}
