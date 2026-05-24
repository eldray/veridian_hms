// modules/admission/AdmissionService.ts
import { PrismaClient } from '@prisma/client';
import { CreateAdmissionDTO, UpdateAdmissionDTO, AddDailyNoteDTO, AdmissionFilters } from './AdmissionTypes';
import { getCounterService } from '../../services/CounterService';

export class AdmissionService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  // ============================================
  // CREATE FORMAL ADMISSION FROM IPD ENCOUNTER
  // ============================================
  async createFormalAdmission(data: CreateAdmissionDTO, userId: string) {
    // Get the encounter
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: data.attendanceId },
      include: { Admission: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    // Must be IPD category
    if (encounter.encounterCategory !== 'ipd') {
      throw new Error('Formal admission can only be created for IPD encounters');
    }

    // Check if already admitted
    if (encounter.Admission) {
      throw new Error('This encounter already has a formal admission record');
    }

    // Check if encounter is active
    if (encounter.status !== 'admitted') {
      throw new Error('Cannot create admission for non-admitted encounter');
    }

    // Generate admission number
    const counterService = getCounterService();
    const admissionNumber = counterService.nextAdmissionNumber();

    // Create admission record (lightweight)
    const admission = await this.prisma.admission.create({
      data: {
        attendanceId: data.attendanceId,
        admissionNumber,
        admissionType: data.admissionType || 'emergency',
        admissionSource: data.admissionSource || 'home',
        admissionDate: data.admissionDate || new Date(),
      },
      include: {
        attendance: {
          include: {
            Patient: true,
            Ward: true,
            Bed: true,
            AttendanceDiagnosis: {
              where: { diagnosisType: 'primary' },
              include: { Diagnosis: true },
              take: 1
            }
          }
        }
      }
    });

    return admission;
  }

// ============================================
// GET ALL FORMAL ADMISSIONS
// ============================================
async getAllAdmissions(filters: AdmissionFilters) {
  // Build where condition for attendance (lowercase a)
  const attendanceWhere: any = {
    encounterCategory: 'ipd',
    Admission: { isNot: null }
  };

  if (filters.status === 'active') {
    attendanceWhere.status = 'admitted';
  } else if (filters.status === 'discharged') {
    attendanceWhere.status = 'discharged';
  }

  if (filters.wardId) {
    attendanceWhere.wardId = filters.wardId;
  }

  if (filters.patientId) {
    attendanceWhere.patientId = filters.patientId;
  }

  // Build where for Admission
  const admissionWhere: any = {};

  if (filters.dateFrom || filters.dateTo) {
    admissionWhere.admissionDate = {};
    if (filters.dateFrom) admissionWhere.admissionDate.gte = filters.dateFrom;
    if (filters.dateTo) admissionWhere.admissionDate.lte = filters.dateTo;
  }

  const page = filters.page || 1;
  const limit = Math.min(100, filters.limit || 50);
  const skip = (page - 1) * limit;

  // ✅ FIXED: Use 'attendance' (lowercase a) - matches Prisma schema
  const [admissions, total] = await Promise.all([
    this.prisma.admission.findMany({
      where: {
        ...admissionWhere,
        attendance: attendanceWhere  // ✅ lowercase 'attendance'
      },
      include: {
        attendance: {  // ✅ lowercase 'attendance'
          include: {
            Patient: {
              select: {
                id: true,
                surname: true,
                otherNames: true,
                folderNumber: true,
                gender: true,
                dateOfBirth: true,
                contact: true
              }
            },
            Ward: true,
            Bed: true,
            AttendanceDiagnosis: {
              where: { diagnosisType: 'primary' },
              include: { Diagnosis: true },
              take: 1
            }
          }
        }
      },
      orderBy: { admissionDate: 'desc' },
      skip,
      take: limit
    }),
    this.prisma.admission.count({
      where: {
        ...admissionWhere,
        attendance: attendanceWhere  // ✅ lowercase 'attendance'
      }
    })
  ]);

  return {
    data: admissions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// ============================================
// GET ADMISSION BY ID
// ============================================
async getAdmissionById(id: string) {
  const admission = await this.prisma.admission.findUnique({
    where: { id },
    include: {
      attendance: {  // ✅ lowercase 'attendance'
        include: {
          Patient: true,
          Ward: true,
          Bed: true,
          AttendanceDiagnosis: {
            include: { Diagnosis: true },
            orderBy: { date: 'asc' }
          },
          Vitals: {
            orderBy: { recordedAt: 'desc' },
            take: 10
          },
          Medication: true,
          LabTest: true,
          Scan: true,
          Procedure: true
        }
      }
    }
  });

  if (!admission) {
    throw new Error('Admission not found');
  }

  return admission;
}

// ============================================
// DISCHARGE ADMISSION
// ============================================
async dischargeAdmission(id: string, data: UpdateAdmissionDTO, userId: string) {
  const admission = await this.prisma.admission.findUnique({
    where: { id },
    include: { attendance: true }  // ✅ lowercase 'attendance'
  });

  if (!admission) {
    throw new Error('Admission not found');
  }

  if (admission.dischargeDate) {
    throw new Error('Patient already discharged');
  }

  const dischargeDate = data.dischargeDate || new Date();

  // Update admission
  await this.prisma.admission.update({
    where: { id },
    data: {
      dischargeDate,
      dischargeStatus: data.dischargeStatus || 'home'
    }
  });

  // Update attendance
  await this.prisma.attendance.update({
    where: { id: admission.attendanceId },
    data: {
      status: 'discharged',
      bedId: null
    }
  });

  // Free the bed
  if (admission.attendance?.bedId) {  // ✅ lowercase 'attendance'
    await this.prisma.bed.update({
      where: { id: admission.attendance.bedId },
      data: { isOccupied: false, currentPatientId: null }
    });

    // Update ward occupancy
    if (admission.attendance.wardId) {
      await this.prisma.ward.update({
        where: { id: admission.attendance.wardId },
        data: { occupiedBeds: { decrement: 1 } }
      });
    }
  }

  return { message: 'Admission discharged successfully', dischargeDate };
}

  // ============================================
  // ADD DAILY NOTES TO ADMISSION
  // ============================================
  async addDailyNotes(id: string, data: AddDailyNoteDTO, userId: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id }
    });

    if (!admission) {
      throw new Error('Admission not found');
    }

    const currentNotes = (admission.dailyNotes as any[]) || [];
    
    const newNote = {
      id: Date.now().toString(),
      notes: data.notes,
      noteType: data.noteType || 'general',
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    const updatedNotes = [...currentNotes, newNote];

    const updated = await this.prisma.admission.update({
      where: { id },
      data: { dailyNotes: updatedNotes }
    });

    return { note: newNote, admission: updated };
  }

// ============================================
// GET ADMISSION STATS
// ============================================
async getAdmissionStats() {
  const [total, active, discharged] = await Promise.all([
    this.prisma.admission.count(),
    this.prisma.admission.count({
      where: { dischargeDate: null }
    }),
    this.prisma.admission.count({
      where: { dischargeDate: { not: null } }
    })
  ]);

  // Get admissions by ward - query admissions with their attendance
  const admissionsWithWard = await this.prisma.admission.findMany({
    where: { dischargeDate: null },
    include: {
      attendance: {  // ✅ lowercase 'attendance'
        select: { wardId: true }
      }
    }
  });

  // Count by ward manually
  const byWardMap = new Map<string, number>();
  for (const admission of admissionsWithWard) {
    const wardId = admission.attendance?.wardId;
    if (wardId) {
      byWardMap.set(wardId, (byWardMap.get(wardId) || 0) + 1);
    }
  }

  const byWard = Array.from(byWardMap.entries()).map(([wardId, count]) => ({
    wardId,
    count
  }));

  // Get length of stay stats
  const admissionsWithLOS = await this.prisma.admission.findMany({
    where: { dischargeDate: { not: null } },
    select: {
      admissionDate: true,
      dischargeDate: true
    }
  });

  let totalDays = 0;
  for (const adm of admissionsWithLOS) {
    if (adm.dischargeDate) {
      const days = Math.ceil((adm.dischargeDate.getTime() - adm.admissionDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += days;
    }
  }

  const averageLOS = admissionsWithLOS.length > 0 ? totalDays / admissionsWithLOS.length : 0;

  return {
    total,
    active,
    discharged,
    averageLengthOfStay: averageLOS,
    byWard
  };
}

// ============================================
// DELETE ADMISSION
// ============================================
async deleteAdmission(id: string) {
  const admission = await this.prisma.admission.findUnique({
    where: { id },
    include: { attendance: true }  // ✅ lowercase 'attendance'
  });

  if (!admission) {
    throw new Error('Admission not found');
  }

  if (!admission.dischargeDate) {
    throw new Error('Cannot delete active admission. Discharge patient first.');
  }

  await this.prisma.admission.delete({
    where: { id }
  });

  return { message: 'Admission deleted successfully' };
}

// ============================================
// GET DAYCASE PATIENTS (Observation/Detention)
// ============================================
async getDaycasePatients(filters: {
  status?: 'active' | 'discharged';
  wardId?: string;
  page?: number;
  limit?: number;
}) {
  const where: any = {
    encounterCategory: 'daycase'
  };

  if (filters.status === 'active') {
    where.status = 'admitted';
  } else if (filters.status === 'discharged') {
    where.status = 'discharged';
  }

  if (filters.wardId) {
    where.wardId = filters.wardId;
  }

  const page = filters.page || 1;
  const limit = Math.min(100, filters.limit || 50);
  const skip = (page - 1) * limit;

  const [encounters, total] = await Promise.all([
    this.prisma.attendance.findMany({
      where,
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            gender: true,
            dateOfBirth: true,
            contact: true
          }
        },
        Ward: true,
        Bed: true,
        AttendanceDiagnosis: {
          where: { diagnosisType: 'primary' },
          include: { Diagnosis: true },
          take: 1
        }
      },
      orderBy: { dateTime: 'desc' },
      skip,
      take: limit
    }),
    this.prisma.attendance.count({ where })
  ]);

  return {
    data: encounters,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

}