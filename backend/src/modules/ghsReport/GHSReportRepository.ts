// modules/ghsReport/GHSReportRepository.ts
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ReportType } from './GHSReportTypes';

// Define types for GHSReportSubmission
interface GHSReportSubmission {
  id: string;
  reportType: string;
  reportingYear: number;
  reportingMonth: number | null;
  reportingQuarter: number | null;
  periodStart: Date;
  periodEnd: Date;
  data: any;
  filePath: string | null;
  submittedToDHIMS2: boolean;
  dhims2Reference: string | null;
  submittedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateGHSReportSubmissionDTO {
  reportType: string;
  reportingYear: number;
  reportingMonth?: number | null;
  reportingQuarter?: number | null;
  periodStart: Date;
  periodEnd: Date;
  data: any;
  filePath?: string | null;
  submittedToDHIMS2?: boolean;
  dhims2Reference?: string | null;
  submittedAt?: Date | null;
  createdById: string;
}

interface UpdateGHSReportSubmissionDTO {
  filePath?: string | null;
  submittedToDHIMS2?: boolean;
  dhims2Reference?: string | null;
  submittedAt?: Date | null;
}

export class GHSReportRepository extends BaseRepository<GHSReportSubmission, CreateGHSReportSubmissionDTO, UpdateGHSReportSubmissionDTO> {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super(prisma, 'gHSReportSubmission');
    this.prisma = prisma;
  }

  async createSubmission(data: CreateGHSReportSubmissionDTO) {
    return await this.create(data);
  }

  async findSubmissions(where?: any) {
    return await this.findMany({
      where,
      include: { 
        createdBy: { 
          select: { 
            fullName: true, 
            username: true 
          } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findSubmissionById(id: string) {
    return await this.findById(id, { 
      createdBy: { 
        select: { 
          fullName: true, 
          username: true 
        } 
      } 
    });
  }

  async getAttendanceCount(where: any) {
    return await this.prisma.attendance.count({ where });
  }

  async getAdmissionCount(where: any) {
    return await this.prisma.admission.count({ where });
  }

  async getPatientWithDiagnoses(startDate: Date, endDate: Date) {
    return await this.prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' }
      },
      include: {
        Patient: {
          select: {
            id: true,
            dateOfBirth: true,
            gender: true
          }
        },
        AttendanceDiagnosis: {
          include: {
            Diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                morbidityGroup: true
              }
            }
          }
        }
      }
    });
  }

  async getAdmissionsWithDetails(startDate: Date, endDate: Date) {
    return await this.prisma.admission.findMany({
      where: {
        admissionDate: { gte: startDate, lte: endDate }
      },
      include: {
        Attendance: {
          include: {
            Patient: {
              select: {
                dateOfBirth: true,
                gender: true
              }
            },
            AttendanceDiagnosis: {
              include: {
                Diagnosis: {
                  select: {
                    name: true,
                    icdCode: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  async getAntenatalBookings(startDate: Date, endDate: Date) {
    return await this.prisma.antenatalBooking.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate }
      },
      include: {
        patient: {
          select: {
            dateOfBirth: true
          }
        }
      }
    });
  }

  async getDeliveryRecords(startDate: Date, endDate: Date) {
    return await this.prisma.deliveryRecord.findMany({
      where: {
        deliveryDate: { gte: startDate, lte: endDate }
      },
      include: {
        patient: {
          select: {
            dateOfBirth: true
          }
        },
        Newborn: true
      }
    });
  }
}