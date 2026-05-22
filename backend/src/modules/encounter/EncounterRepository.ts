// modules/encounter/EncounterRepository.ts
import { PrismaClient, AttendanceStatus, PaymentMode } from '@prisma/client';
import { CreateEncounterDTO, UpdateEncounterDTO, EncounterFilters, AddDiagnosisDTO, AddVitalsDTO, AddPrescriptionDTO, AddLabTestDTO } from './EncounterTypes';
import { getCounterService } from '../../services/CounterService';

export class EncounterRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  // ============================================
  // CREATE ENCOUNTER
  // ============================================
  async create(data: CreateEncounterDTO, userId: string) {
    const counterService = getCounterService(); 
    return this.prisma.attendance.create({
      data: {
        attendanceNumber:  counterService.nextAttendanceNumber(),
        patientId: data.patientId,
        attendanceType: data.encounterType,
        paymentMode: data.paymentMode,
        nhisCCC: data.nhisCCC,
        insuranceProviderId: data.insuranceProviderId,
        complaints: data.complaint || '',
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
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            dateOfBirth: true,
            gender: true,
            contact: true
          }
        },
        AttendanceDiagnosis: {
          include: {
            Diagnosis: true
          },
          orderBy: {
            date: 'desc'
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
            User_Medication_prescribedByIdToUser: {
              select: { fullName: true }
            }
          }
        },
        LabTest: {
          include: {
            LabTestTemplate: true,
            User_LabTest_performedByIdToUser: {
              select: { fullName: true }
            }
          },
          orderBy: {
            requestedAt: 'desc'
          }
        },
        ReferralRecord: {
          select: {
            id: true,
            referralNumber: true,
            referralType: true,
            referralReason: true,
            referralNotes: true,
            referredToFacility: true,
            referredToDoctor: true,
            referredToDepartment: true,
            referredFromFacility: true,
            referredFromDoctor: true,
            referralDate: true,
            status: true,
            outcomeNotes: true,
            urgency: true
          }
        },
        ServiceRendered: {
          include: {
            ServiceCatalog: {  // ← Try this instead of 'serviceItem'
              include: {
                pricing: true
              }
            }
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
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              dateOfBirth: true,
              gender: true,
              contact: true
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
            id: true,
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
    // Get patientId from attendance
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { patientId: true }
    });

    if (!attendance) {
      throw new Error('Encounter not found');
    }

    // Build blood pressure string
    let bloodPressure = null;
    if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
      bloodPressure = `${data.bloodPressureSystolic}/${data.bloodPressureDiastolic}`;
    }

    return this.prisma.vitals.create({
      data: {
        attendanceId: encounterId,
        patientId: attendance.patientId,
        temperature: data.temperature,
        bloodPressure: bloodPressure,
        pulse: data.pulse,
        respiration: data.respiratoryRate,
        spo2: data.oxygenSaturation,
        weight: data.weight,
        height: data.height,
        muac: data.muac,
        notes: data.notes,
        recordedById: userId,
        recordedAt: new Date()
      },
      include: {
        User: {
          select: { fullName: true }
        }
      }
    });
  }

  // ============================================
  // ADD PRESCRIPTION TO ENCOUNTER
  // ============================================
  async addPrescription(encounterId: string, data: AddPrescriptionDTO, userId: string) {
    // Get service catalog to get medication name
    const serviceCatalog = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId },
      include: { StockItem: true }
    });

    const medicationName = serviceCatalog?.name || serviceCatalog?.StockItem?.name || 'Medication';

    return this.prisma.medication.create({
      data: {
        attendanceId: encounterId,
        stockItemId: data.stockItemId,
        serviceCatalogId: data.serviceCatalogId,
        name: medicationName,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        route: data.route,
        instructions: data.instructions,
        quantity: 1,
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
  // ADD LAB ORDER TO ENCOUNTER (using LabTest)
  // ============================================
  async addLabOrder(encounterId: string, data: AddLabTestDTO, userId: string) {
    // Get the lab test template
    const labTestTemplate = await this.prisma.labTestTemplate.findUnique({
      where: { id: data.templateId }
    });

    if (!labTestTemplate) {
      throw new Error('Lab test template not found');
    }

    return this.prisma.labTest.create({
      data: {
        attendanceId: encounterId,
        templateId: labTestTemplate.id,
        status: 'requested',
        priority: data.priority || 'routine',
        requestedAt: new Date(),
        createdById: userId,
        notes: data.clinicalNotes
      },
      include: {
        LabTestTemplate: true
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
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            dateOfBirth: true,
            gender: true
          }
        }
      },
      orderBy: { admissionDate: 'asc' }  // ✅ Fixed
    });
  
    return admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        name: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim(),
        age: this.calculateAge(admission.Patient.dateOfBirth),
        gender: admission.Patient.gender
      },
      encounterType: 'admission',
      priority: 'normal',
      waitTime: Math.floor((Date.now() - new Date(admission.admissionDate).getTime()) / 60000),
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
            medicalNotes: { not: null },
            dateTime: { gte: today }
          }
        }
      },
      include: {
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            dateOfBirth: true,
            gender: true
          }
        },
        Vitals: {
          where: { recordedAt: { gte: today } },
          orderBy: { recordedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { admissionDate: 'asc' }  // ✅ Fixed
    });
  
    return admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        name: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim(),
        age: this.calculateAge(admission.Patient.dateOfBirth),
        gender: admission.Patient.gender
      },
      vitals: admission.vitals[0],
      encounterType: 'consultation',
      priority: 'normal',
      waitTime: Math.floor((Date.now() - new Date(admission.admissionDate).getTime()) / 60000),
      status: 'pending_doctor'
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
            medicalNotes: { not: null },
            dateTime: { gte: today }
          }
        }
      },
      include: {
        Patient: {
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
      orderBy: { admissionDate: 'asc' }  // ✅ Changed from admittedAt to admissionDate
    });

    return admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        name: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim(),
        age: this.calculateAge(admission.Patient.dateOfBirth),
        gender: admission.Patient.gender
      },
      vitals: admission.vitals[0],
      encounterType: 'consultation',
      priority: 'normal',
      waitTime: Math.floor((Date.now() - new Date(admission.admissionDate).getTime()) / 60000),
      status: 'pending_doctor'
    }));
  }

  async getLabWorklist() {
    const pendingLabTests = await this.prisma.labTest.findMany({
      where: {
        status: { in: ['requested', 'in_progress'] }
      },
      include: {
        Attendance: {
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                dateOfBirth: true
              }
            }
          }
        },
        LabTestTemplate: true
      },
      orderBy: { requestedAt: 'asc' }
    });

    return pendingLabTests.map(test => ({
      id: test.id,
      patientId: test.Attendance.patientId,
      patient: {
        name: `${test.Attendance.Patient.surname} ${test.Attendance.Patient.otherNames}`.trim(),
        age: this.calculateAge(test.Attendance.Patient.dateOfBirth)
      },
      testName: test.LabTestTemplate?.name || 'Unknown Test',
      priority: test.priority,
      waitTime: Math.floor((Date.now() - new Date(test.requestedAt).getTime()) / 60000),
      status: test.status
    }));
  }

  async getPharmacyWorklist() {
    const pendingMeds = await this.prisma.medication.findMany({
      where: {
        status: 'prescribed'
      },
      include: {
        Attendance: {
          include: {
            Patient: {
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
      patientId: med.Attendance.patientId,
      patient: {
        name: `${med.Attendance.Patient.surname} ${med.Attendance.Patient.otherNames}`.trim(),
        age: this.calculateAge(med.Attendance.Patient.dateOfBirth)
      },
      medicationName: med.StockItem?.name || med.name,
      dosage: med.dosage,
      waitTime: Math.floor((Date.now() - new Date(med.prescribedAt).getTime()) / 60000),
      status: med.status
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