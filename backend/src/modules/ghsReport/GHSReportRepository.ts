// GHSReportRepository.ts - Data access layer for GHS Report module

import { BaseRepository } from '../../shared/base/BaseRepository';
import { PrismaClient } from '@prisma/client';
import { ReportType } from './GHSReportTypes';

const prisma = new PrismaClient();

export class GHSReportRepository extends BaseRepository<any> {
  constructor() {
    super();
  }

  async createSubmission(data: {
    reportType: ReportType;
    reportingYear: number;
    reportingMonth: number;
    periodStart: Date;
    periodEnd: Date;
    data: any;
    createdById: string;
  }) {
    return await prisma.gHSReportSubmission.create({ data });
  }

  async findSubmissions(where?: any) {
    return await prisma.gHSReportSubmission.findMany({
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
    return await prisma.gHSReportSubmission.findUnique({
      where: { id },
      include: { 
        createdBy: { 
          select: { 
            fullName: true, 
            username: true 
          } 
        } 
      }
    });
  }

  async getAttendanceCount(where: any) {
    return await prisma.attendance.count({ where });
  }

  async getAdmissionCount(where: any) {
    return await prisma.admission.count({ where });
  }

  async getPatientWithDiagnoses(startDate: Date, endDate: Date) {
    return await prisma.attendance.findMany({
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
    return await prisma.admission.findMany({
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

  async getANCRegistrations(startDate: Date, endDate: Date) {
    return await prisma.antenatalRegistration.findMany({
      where: {
        registrationDate: { gte: startDate, lte: endDate }
      },
      include: {
        Patient: {
          select: {
            dateOfBirth: true
          }
        }
      }
    });
  }

  async getDeliveries(startDate: Date, endDate: Date) {
    return await prisma.delivery.findMany({
      where: {
        deliveryDate: { gte: startDate, lte: endDate }
      },
      include: {
        Mother: {
          select: {
            dateOfBirth: true
          }
        }
      }
    });
  }
}
