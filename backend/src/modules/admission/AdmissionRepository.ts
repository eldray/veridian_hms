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
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true,
              paymentMode: true,
              gender: true,
              dateOfBirth: true,
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
                date: 'asc',
              },
            },
            Vitals: {
              orderBy: { recordedAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });
  }

  // Find admission with attendance
  async findByIdWithAttendance(id: string) {
    return prisma.admission.findUnique({
      where: { id },
      include: { 
        Attendance: {
          include: {
            AttendanceDiagnosis: true
          }
        } 
      },
    });
  }

  // Create admission
  async create(data: any) {
    return prisma.admission.create({
      data,
      include: {
        Patient: {
          select: {
            id: true,
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return prisma.admission.count({
      where: {
        admissionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });
  }

  // Get admission stats
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [total, admitted, discharged, todayAdmissions] = await Promise.all([
      prisma.admission.count(),
      prisma.admission.count({ where: { status: 'admitted' } }),
      prisma.admission.count({ where: { status: 'discharged' } }),
      prisma.admission.count({
        where: {
          admissionDate: {
            gte: today,
          },
        },
      }),
    ]);

    return { total, admitted, discharged, todayAdmissions };
  }

  // Get admissions by patient ID
  async findByPatientId(patientId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where: { patientId },
        include: {
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
        skip,
        take: limit,
      }),
      prisma.admission.count({ where: { patientId } }),
    ]);

    return { admissions, total };
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

  async updateAttendanceDiagnosis(id: string, data: any) {
    return prisma.attendanceDiagnosis.update({ where: { id }, data });
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

  async updateWard(wardId: string, data: { occupiedBeds: { increment: number } | { decrement: number } }) {
    const ward = await prisma.ward.findUnique({ where: { id: wardId } });
    if (!ward) return null;
    
    let newOccupiedBeds = ward.occupiedBeds;
    if ('increment' in data.occupiedBeds) {
      newOccupiedBeds += data.occupiedBeds.increment;
    } else if ('decrement' in data.occupiedBeds) {
      newOccupiedBeds -= data.occupiedBeds.decrement;
    }
    
    return prisma.ward.update({
      where: { id: wardId },
      data: { occupiedBeds: newOccupiedBeds },
    });
  }
}