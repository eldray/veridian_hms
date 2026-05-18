// modules/encounter/EncounterRepository.ts
import { PrismaClient, AttendanceStatus, PaymentMode } from '@prisma/client';
import { CreateEncounterDTO, UpdateEncounterDTO, EncounterFilters, AddDiagnosisDTO, AddVitalsDTO, AddPrescriptionDTO, AddLabOrderDTO } from './EncounterTypes';

export class EncounterRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  // ============================================
  // CREATE ENCOUNTER
  // ============================================
  async create(data: CreateEncounterDTO, userId: string) {
    return this.prisma.attendance.create({
      data: {
        patientId: data.patientId,
        attendanceType: data.encounterType,
        paymentMode: data.paymentMode,
        nhisCCC: data.nhisCCC,
        insuranceProviderId: data.insuranceProviderId,
        complaint: data.complaint,
        status: 'pending',
        createdById: userId,
        dateTime: new Date(),
      },
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            dateOfBirth: true,
            gender: true
          }
        }
      }
    });
  }

  // ============================================
  // FIND BY ID WITH RELATIONS
  // ============================================
  async findById(id: string) {
    return this.prisma.attendance.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            dateOfBirth: true,
            gender: true,
            phone: true
          }
        },
        AttendanceDiagnosis: {
          include: {
            Diagnosis: true
          },
          orderBy: {
            diagnosisType: 'asc'
          }
        },
        Vitals: {
          orderBy: {
            recordedAt: 'desc'
          },
          take: 5
        },
        Medication: {
          include: {
            StockItem: {
              select: {
                id: true,
                name: true,
                currentStock: true,
                unitOfMeasure: true
              }
            },
            prescribedBy: {
              select: { fullName: true }
            }
          }
        },
        LabOrder: {
          include: {
            LabTest: true,
            performedBy: {
              select: { fullName: true }
            }
          }
        },
        ReferralRecord: {
          include: {
            referredTo: {
              select: { name: true }
            }
          }
        },
        ServiceRendered: {
          include: {
            serviceItem: true
          }
        }
      }
    });
  }

  // ============================================
  // FIND MANY WITH FILTERS
  // ============================================
  async findMany(filters: EncounterFilters) {
    const {
      patientId,
      encounterType,
      status,
      paymentMode,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = filters;

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (encounterType) where.attendanceType = encounterType;
    if (status) where.status = status;
    if (paymentMode) where.paymentMode = paymentMode;
    
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [encounters, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          }
        },
        orderBy: { dateTime: 'desc' },
        skip,
        take: limitNum
      }),
      this.prisma.attendance.count({ where })
    ]);

    return {
      data: encounters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  // ============================================
  // UPDATE ENCOUNTER
  // ============================================
  async update(id: string, data: UpdateEncounterDTO) {
    return this.prisma.attendance.update({
      where: { id },
      data,
      include: {
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        }
      }
    });
  }

  // ============================================
  // ADD DIAGNOSIS TO ENCOUNTER
  // ============================================
  async addDiagnosis(encounterId: string, data: AddDiagnosisDTO, userId: string) {
    // If primary, convert existing primary to additional
    if (data.diagnosisType === 'primary') {
      await this.prisma.attendanceDiagnosis.updateMany({
        where: {
          attendanceId: encounterId,
          diagnosisType: 'primary'
        },
        data: { diagnosisType: 'additional' }
      });
    }

    // Check if diagnosis already exists
    const existing = await this.prisma.attendanceDiagnosis.findFirst({
      where: {
        attendanceId: encounterId,
        diagnosisId: data.diagnosisId
      }
    });

    if (existing) {
      throw new Error('Diagnosis already added to this encounter');
    }

    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: { id: data.diagnosisId }
    });

    return this.prisma.attendanceDiagnosis.create({
      data: {
        attendanceId: encounterId,
        diagnosisId: data.diagnosisId,
        diagnosisType: data.diagnosisType,
        notes: data.notes,
        createdById: userId,
        icdCode: diagnosis?.icdCode || ''
      },
      include: {
        Diagnosis: true
      }
    });
  }

  // ============================================
  // ADD VITALS TO ENCOUNTER
  // ============================================
  async addVitals(encounterId: string, data: AddVitalsDTO, userId: string) {
    return this.prisma.vitals.create({
      data: {
        attendanceId: encounterId,
        temperature: data.temperature,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        pulse: data.pulse,
        respiratoryRate: data.respiratoryRate,
        oxygenSaturation: data.oxygenSaturation,
        weight: data.weight,
        height: data.height,
        muac: data.muac,
        notes: data.notes,
        recordedById: userId,
        recordedAt: new Date()
      },
      include: {
        recordedBy: {
          select: { fullName: true }
        }
      }
    });
  }

  // ============================================
  // ADD PRESCRIPTION TO ENCOUNTER
  // ============================================
  async addPrescription(encounterId: string, data: AddPrescriptionDTO, userId: string) {
    return this.prisma.medication.create({
      data: {
        attendanceId: encounterId,
        stockItemId: data.stockItemId,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        route: data.route,
        instructions: data.instructions,
        status: 'prescribed',
        prescribedById: userId,
        prescribedAt: new Date()
      },
      include: {
        StockItem: {
          select: {
            id: true,
            name: true,
            currentStock: true,
            unitOfMeasure: true
          }
        }
      }
    });
  }

  // ============================================
  // ADD LAB ORDER TO ENCOUNTER
  // ============================================
  async addLabOrder(encounterId: string, data: AddLabOrderDTO, userId: string) {
    return this.prisma.labOrder.create({
      data: {
        attendanceId: encounterId,
        testId: data.testId,
        priority: data.priority,
        status: 'pending',
        clinicalNotes: data.clinicalNotes,
        orderedById: userId,
        orderedAt: new Date()
      },
      include: {
        LabTest: true
      }
    });
  }

  // ============================================
  // GET WORKLIST ITEMS (CLINICAL QUEUES)
  // ============================================
  async getVitalsWorklist() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const admissions = await this.prisma.admission.findMany({
      where: {
        status: { in: ['admitted', 'checked_in'] },
        vitals: {
          none: {
            recordedAt: { gte: today }
          }
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            dateOfBirth: true,
            gender: true
          }
        }
      },
      orderBy: { admittedAt: 'asc' }
    });

    return admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        name: `${admission.patient.surname} ${admission.patient.otherNames}`.trim(),
        age: this.calculateAge(admission.patient.dateOfBirth),
        gender: admission.patient.gender
      },
      encounterType: 'admission',
      priority: 'normal',
      waitTime: Math.floor((Date.now() - new Date(admission.admittedAt).getTime()) / 60000),
      status: 'pending_vitals'
    }));
  }

  async getMedicalWorklist() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const admissions = await this.prisma.admission.findMany({
      where: {
        status: { in: ['admitted', 'checked_in'] },
        vitals: {
          some: {
            recordedAt: { gte: today }
          }
        },
        attendance: {
          none: {
            notes: { not: null },
            dateTime: { gte: today }
          }
        }
      },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            dateOfBirth: true,
            gender: true
          }
        },
        vitals: {
          where: { recordedAt: { gte: today } },
          orderBy: { recordedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { admittedAt: 'asc' }
    });

    return admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        name: `${admission.patient.surname} ${admission.patient.otherNames}`.trim(),
        age: this.calculateAge(admission.patient.dateOfBirth),
        gender: admission.patient.gender
      },
      vitals: admission.vitals[0],
      encounterType: 'consultation',
      priority: 'normal',
      waitTime: Math.floor((Date.now() - new Date(admission.admittedAt).getTime()) / 60000),
      status: 'pending_doctor'
    }));
  }

  async getLabWorklist() {
    const pendingOrders = await this.prisma.labOrder.findMany({
      where: {
        status: 'pending'
      },
      include: {
        attendance: {
          include: {
            patient: {
              select: {
                surname: true,
                otherNames: true,
                dateOfBirth: true
              }
            }
          }
        },
        LabTest: true
      },
      orderBy: { orderedAt: 'asc' }
    });

    return pendingOrders.map(order => ({
      id: order.id,
      patientId: order.attendance.patientId,
      patient: {
        name: `${order.attendance.patient.surname} ${order.attendance.patient.otherNames}`.trim(),
        age: this.calculateAge(order.attendance.patient.dateOfBirth)
      },
      testName: order.LabTest.name,
      priority: order.priority,
      waitTime: Math.floor((Date.now() - new Date(order.orderedAt).getTime()) / 60000),
      status: 'pending_lab'
    }));
  }

  async getPharmacyWorklist() {
    const pendingMeds = await this.prisma.medication.findMany({
      where: {
        status: 'prescribed'
      },
      include: {
        attendance: {
          include: {
            patient: {
              select: {
                surname: true,
                otherNames: true,
                dateOfBirth: true
              }
            }
          }
        },
        StockItem: true
      },
      orderBy: { prescribedAt: 'asc' }
    });

    return pendingMeds.map(med => ({
      id: med.id,
      patientId: med.attendance.patientId,
      patient: {
        name: `${med.attendance.patient.surname} ${med.attendance.patient.otherNames}`.trim(),
        age: this.calculateAge(med.attendance.patient.dateOfBirth)
      },
      medicationName: med.StockItem.name,
      dosage: med.dosage,
      waitTime: Math.floor((Date.now() - new Date(med.prescribedAt).getTime()) / 60000),
      status: 'pending_pharmacy'
    }));
  }

  // ============================================
  // HELPER: Calculate Age
  // ============================================
  private calculateAge(dateOfBirth: Date): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
