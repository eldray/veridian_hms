// modules/admission/AdmissionRepository.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdmissionRepository {
  // Get all admissions with filtering and pagination
  async findAll(where: any, skip: number, take: number) {
    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        include: {
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true,
              paymentMode: true,
            },
          },
          Ward: {
            select: {
              wardName: true,
              wardType: true,
            },
          },
          Bed: {
            select: {
              bedNumber: true,
            },
          },
          Attendance: {
            include: {
              AttendanceDiagnosis: {
                where: { diagnosisType: 'primary' },
                include: { Diagnosis: true },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          admissionDate: 'desc',
        },
        skip,
        take,
      }),
      prisma.admission.count({ where }),
    ]);

    return { admissions, total };
  }

  // Find admission by ID
  async findById(id: string) {
    return prisma.admission.findUnique({
      where: { id },
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            gender: true,
            dateOfBirth: true,
            paymentMode: true,
            InsuranceProvider: {
              select: {
                name: true,
                type: true,
                coveragePercentage: true,
              },
            },
          },
        },
        Ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true,
          },
        },
        Bed: {
          select: {
            id: true,
            bedNumber: true,
            isOccupied: true,
          },
        },
        Attendance: {
          include: {
            AttendanceDiagnosis: {
              include: {
                Diagnosis: true,
              },
              orderBy: {
                diagnosisType: 'asc',
              },
            },
            Vitals: {
              orderBy: { recordedAt: 'desc' },
              take: 5,
            },
          },
        },
        Bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });
  }

  // Find admission with attendance
  async findByIdWithAttendance(id: string) {
    return prisma.admission.findUnique({
      where: { id },
      include: { Attendance: true },
    });
  }

  // Create admission
  async create(data: any) {
    return prisma.admission.create({
      data,
      include: {
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            paymentMode: true,
          },
        },
        Ward: {
          select: {
            wardName: true,
            wardType: true,
          },
        },
        Bed: {
          select: {
            bedNumber: true,
          },
        },
        Attendance: {
          include: {
            AttendanceDiagnosis: {
              where: { diagnosisType: 'primary' },
              include: { Diagnosis: true },
            },
          },
        },
      },
    });
  }

  // Update admission
  async update(id: string, data: any) {
    return prisma.admission.update({
      where: { id },
      data,
    });
  }

  // Delete admission
  async delete(id: string) {
    return prisma.admission.delete({
      where: { id },
    });
  }

  // Find active admission for patient
  async findActiveByPatientId(patientId: string) {
    return prisma.admission.findFirst({
      where: {
        patientId,
        status: 'admitted',
      },
    });
  }

  // Count admissions for numbering
  async countForCurrentMonth() {
    return prisma.admission.count({
      where: {
        admissionDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        },
      },
    });
  }

  // Get admission stats
  async getStats() {
    const [total, admitted, discharged, todayAdmissions] = await Promise.all([
      prisma.admission.count(),
      prisma.admission.count({ where: { status: 'admitted' } }),
      prisma.admission.count({ where: { status: 'discharged' } }),
      prisma.admission.count({
        where: {
          admissionDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return { total, admitted, discharged, todayAdmissions };
  }

  // Get admissions by patient ID
  async findByPatientId(patientId: string) {
    return prisma.admission.findMany({
      where: { patientId },
      include: {
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
          },
        },
        Ward: {
          select: {
            wardName: true,
          },
        },
        Bed: {
          select: {
            bedNumber: true,
          },
        },
      },
      orderBy: {
        admissionDate: 'desc',
      },
    });
  }

  // Transaction helpers
  async findBed(bedId: string) {
    return prisma.bed.findUnique({
      where: { id: bedId },
      include: { Ward: true },
    });
  }

  async findDiagnosis(diagnosisId: string) {
    return prisma.diagnosis.findUnique({
      where: { id: diagnosisId },
    });
  }

  async findAttendance(attendanceId: string) {
    return prisma.attendance.findUnique({
      where: { id: attendanceId },
    });
  }

  async createAttendance(data: any) {
    return prisma.attendance.create({ data });
  }

  async updateAttendance(id: string, data: any) {
    return prisma.attendance.update({ where: { id }, data });
  }

  async createAttendanceDiagnosis(data: any) {
    return prisma.attendanceDiagnosis.create({ data });
  }

  async findExistingDiagnosis(attendanceId: string, diagnosisId: string) {
    return prisma.attendanceDiagnosis.findFirst({
      where: { attendanceId, diagnosisId },
    });
  }

  async deleteAttendanceDiagnosis(id: string) {
    return prisma.attendanceDiagnosis.delete({ where: { id } });
  }

  async updateBed(bedId: string, data: any) {
    return prisma.bed.update({ where: { id: bedId }, data });
  }

  async updateWard(wardId: string, data: any) {
    return prisma.ward.update({ where: { id: wardId }, data });
  }

  async createDailyNote(data: any) {
    return prisma.admissionNote.create({ data });
  }

  async findDailyNotes(admissionId: string) {
    return prisma.admissionNote.findMany({
      where: { admissionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
