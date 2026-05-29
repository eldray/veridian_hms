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
        attendanceType: data.attendanceType,
        paymentMode: data.paymentMode,
        nhisCCC: data.nhisCCC,
        insuranceProviderId: data.insuranceProviderId,
        complaints: data.complaint || '',
        status: 'pending',
        createdById: userId,
        dateTime: new Date(), 
        createdAt: new Date()
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
      referral: {  // ✅ FIXED: Changed from 'ReferralRecord' to 'referral'
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
          ServiceCatalog: {
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
      data: {
        ...data,
        updatedAt: new Date()  // ✅ Ensure updatedAt is set
      },
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
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { patientId: true }
    });
  
    if (!attendance) {
      throw new Error('Encounter not found');
    }
  
    return this.prisma.vitals.create({
      data: {
        attendanceId: encounterId,
        patientId: attendance.patientId,
        bloodPressure: data.bloodPressure,
        temperature: data.temperature,
        pulse: data.pulse,
        respiration: data.respiration,
        spo2: data.spo2,
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

// modules/encounter/EncounterRepository.ts

// ============================================
// ADD PRESCRIPTION TO ENCOUNTER (FIXED)
// ============================================
async addPrescription(encounterId: string, data: AddPrescriptionDTO, userId: string) {
  // Get stock item to get medication name
  const stockItem = await this.prisma.stockItem.findUnique({
    where: { id: data.stockItemId }
  });

  if (!stockItem) {
    throw new Error('Stock item not found');
  }

  // Get service catalog for pricing
  const serviceCatalog = await this.prisma.serviceCatalog.findUnique({
    where: { id: data.serviceCatalogId }
  });

  if (!serviceCatalog) {
    throw new Error('Service catalog item not found');
  }

  // Use stockItem.name for medication name (not a separate name field)
  const medicationName = stockItem.name;

  return this.prisma.medication.create({
    data: {
      attendanceId: encounterId,
      stockItemId: data.stockItemId,
      serviceCatalogId: data.serviceCatalogId,
      name: medicationName,  // StockItem.name is the source
      dosage: data.dosage,
      frequency: data.frequency,
      duration: data.duration,
      route: data.route,
      instructions: data.instructions,
      quantity: data.quantity || 1,
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
// ADD LAB TEST TO ENCOUNTER (FIXED)
// ============================================
async addLabTest(encounterId: string, data: AddLabTestDTO, userId: string) {
  // Get the lab test template
  const labTestTemplate = await this.prisma.labTestTemplate.findUnique({
    where: { id: data.templateId }
  });

  if (!labTestTemplate) {
    throw new Error('Lab test template not found');
  }

  // If serviceCatalogId is provided, verify it exists
  if (data.serviceCatalogId) {
    const serviceCatalog = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId }
    });
    if (!serviceCatalog) {
      throw new Error('Service catalog item not found');
    }
  }

  return this.prisma.labTest.create({
    data: {
      attendanceId: encounterId,
      templateId: labTestTemplate.id,
      serviceCatalogId: data.serviceCatalogId || null,
      status: 'requested',
      priority: data.priority || 'routine',
      requestedAt: new Date(),
      createdById: userId,
      notes: data.notes
    },
    include: {
      LabTestTemplate: true,
      ServiceCatalog: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    }
  });
}

// ============================================
// ADD SCAN TO ENCOUNTER (FIXED)
// ============================================
async addScan(encounterId: string, data: any, userId: string) {
  // Get scan template
  const scanTemplate = await this.prisma.scanTemplate.findUnique({
    where: { id: data.templateId }
  });

  if (!scanTemplate) {
    throw new Error('Scan template not found');
  }

  // Verify service catalog exists
  if (data.serviceCatalogId) {
    const serviceCatalog = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId }
    });
    if (!serviceCatalog) {
      throw new Error('Service catalog item not found');
    }
  }

  return this.prisma.scan.create({
    data: {
      attendanceId: encounterId,
      templateId: scanTemplate.id,
      serviceCatalogId: data.serviceCatalogId,
      scanType: scanTemplate.scanType || scanTemplate.name,
      description: scanTemplate.description || '',
      bodyPart: data.bodyPart || null,
      status: 'requested',
      priority: data.priority || 'routine',
      requestedAt: new Date(),
      createdById: userId,
      notes: data.notes
    },
    include: {
      ScanTemplate: true,
      ServiceCatalog: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    }
  });
}

// ============================================
// ADD PROCEDURE TO ENCOUNTER (FIXED)
// ============================================
async addProcedure(encounterId: string, data: any, userId: string) {
  // Get procedure template
  const procedureTemplate = await this.prisma.procedureTemplate.findUnique({
    where: { id: data.templateId }
  });

  if (!procedureTemplate) {
    throw new Error('Procedure template not found');
  }

  // Verify service catalog exists
  if (data.serviceCatalogId) {
    const serviceCatalog = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId }
    });
    if (!serviceCatalog) {
      throw new Error('Service catalog item not found');
    }
  }

  return this.prisma.procedure.create({
    data: {
      attendanceId: encounterId,
      templateId: procedureTemplate.id,
      serviceCatalogId: data.serviceCatalogId,
      status: 'scheduled',
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      notes: data.notes,
      duration: data.duration || null,
      createdById: userId
    },
    include: {
      ProcedureTemplate: true,
      ServiceCatalog: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    }
  });
}

async addService(encounterId: string, data: any, userId: string) {
  return this.prisma.serviceRendered.create({
    data: {
      attendanceId: encounterId,
      serviceItemId: data.serviceCatalogId,
      quantity: data.quantity || 1,
      date: new Date(),
      performedById: userId,
      notes: data.notes
    }
  });
}

// ============================================
// VITALS WORKLIST - Returns ALL active patients with vitals flag
// ============================================
async getVitalsWorklist(): Promise<VitalsWorklistResponse> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get ALL active encounters (not discharged/completed)
  const activeAttendances = await this.prisma.attendance.findMany({
    where: {
      status: { in: ['pending', 'admitted'] },
      encounterCategory: { in: ['opd', 'ipd', 'daycase'] }
    },
    include: {
      Patient: {
        select: {
          id: true,
          surname: true,
          otherNames: true,
          dateOfBirth: true,
          gender: true,
          folderNumber: true
        }
      },
      Bed: {
        include: { Ward: true }
      },
      Vitals: {
        orderBy: { recordedAt: 'desc' },
        take: 1  // Get only the most recent vitals
      }
    },
    orderBy: { dateTime: 'asc' }
  });

  // Process each attendance to determine if vitals recorded today
  const processedItems = activeAttendances.map(attendance => {
    const lastVitals = attendance.Vitals?.[0];
    const hasVitalsToday = lastVitals 
      ? new Date(lastVitals.recordedAt).toDateString() === today.toDateString()
      : false;
    
    const waitTime = hasVitalsToday 
      ? 0  // No wait time if vitals already recorded
      : Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000);
    
    let priority: 'routine' | 'urgent' | 'stat' = 'routine';
    if (!hasVitalsToday) {
      const waitHours = waitTime / 60;
      if (waitHours > 48) priority = 'stat';
      else if (waitHours > 24) priority = 'urgent';
    }
    
    return {
      id: attendance.id,
      patientId: attendance.patientId,
      attendanceId: attendance.id,
      patient: {
        name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(),
        age: this.calculateAge(attendance.Patient.dateOfBirth),
        gender: attendance.Patient.gender,
        folderNumber: attendance.Patient.folderNumber
      },
      location: attendance.Bed ? {
        ward: attendance.Bed.Ward?.wardName,
        bed: attendance.Bed.bedNumber
      } : undefined,
      hasVitalsToday,
      lastVitals: lastVitals ? {
        bloodPressure: lastVitals.bloodPressure,
        temperature: lastVitals.temperature,
        pulse: lastVitals.pulse,
        respiration: lastVitals.respiration,
        spo2: lastVitals.spo2,
        recordedAt: lastVitals.recordedAt
      } : null,
      vitalsRecordedAt: lastVitals?.recordedAt,
      waitTime,
      priority,
      status: hasVitalsToday ? 'vitals_done' : 'pending_vitals',
      encounterCategory: attendance.encounterCategory
    };
  });

  const pending = processedItems.filter(i => !i.hasVitalsToday);
  const recent = processedItems.filter(i => i.hasVitalsToday);

  console.log(`Vitals Worklist: ${pending.length} pending, ${recent.length} recent`);

  return {
    total: processedItems.length,
    pending: pending.length,
    recent: recent.length,
    data: processedItems
  };
}


// ============================================
// MEDICAL WORKLIST - Patients needing doctor review
// ============================================
async getMedicalWorklist(): Promise<MedicalWorklistResponse> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeAttendances = await this.prisma.attendance.findMany({
    where: {
      status: { in: ['pending', 'admitted'] },
      encounterCategory: { in: ['opd', 'ipd', 'daycase'] }
    },
    include: {
      Patient: {
        select: {
          id: true,
          surname: true,
          otherNames: true,
          dateOfBirth: true,
          gender: true,
          folderNumber: true
        }
      },
      Bed: {
        include: { Ward: true }
      },
      Vitals: {
        where: { recordedAt: { gte: today } },
        orderBy: { recordedAt: 'desc' },
        take: 1
      },
      AttendanceDiagnosis: {
        take: 1
      }
    },
    orderBy: { dateTime: 'asc' }
  });

  const processedItems: MedicalWorklistItem[] = activeAttendances.map(attendance => {
    const hasVitalsToday = (attendance.Vitals?.length || 0) > 0;
    const hasMedicalNotesToday = attendance.medicalNotes !== null && attendance.medicalNotes !== '';
    const hasDiagnosis = (attendance.AttendanceDiagnosis?.length || 0) > 0;
    
    // Pending if has vitals but no medical notes/diagnosis
    const isPending = hasVitalsToday && !hasMedicalNotesToday && !hasDiagnosis;
    
    const waitTime = isPending
      ? Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000)
      : 0;
    
    let priority: 'routine' | 'urgent' | 'stat' = 'routine';
    const waitHours = waitTime / 60;
    if (waitHours > 48) priority = 'stat';
    else if (waitHours > 24) priority = 'urgent';
    
    return {
      id: attendance.id,
      patientId: attendance.patientId,
      attendanceId: attendance.id,
      patient: {
        name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(),
        age: this.calculateAge(attendance.Patient.dateOfBirth),
        gender: attendance.Patient.gender,
        folderNumber: attendance.Patient.folderNumber
      },
      location: attendance.Bed ? {
        ward: attendance.Bed.Ward?.wardName,
        bed: attendance.Bed.bedNumber
      } : undefined,
      hasMedicalNotesToday,
      vitals: attendance.Vitals?.[0],
      hasDiagnosis,
      waitTime,
      priority,
      status: isPending ? 'pending_doctor' : (hasMedicalNotesToday ? 'reviewed' : 'pending_vitals_first'),
      encounterCategory: attendance.encounterCategory
    };
  });

  const pending = processedItems.filter(i => i.status === 'pending_doctor');
  const reviewed = processedItems.filter(i => i.hasMedicalNotesToday);

  return {
    total: processedItems.length,
    pending: pending.length,
    reviewed: reviewed.length,
    data: processedItems
  };
}

// modules/encounter/EncounterRepository.ts

// ============================================
// LAB WORKLIST - GROUPED BY PATIENT
// ============================================
async getLabWorklist(): Promise<LabWorklistResponse> {
  // Get all lab tests
  const allLabTests = await this.prisma.labTest.findMany({
    where: {
      status: { in: ['requested', 'in_progress', 'completed'] }
    },
    include: {
      Attendance: {
        include: {
          Patient: true,
          Bed: { include: { Ward: true } }
        }
      },
      LabTestTemplate: true
    },
    orderBy: { requestedAt: 'asc' }
  });

  // Group by attendanceId
  const groupedByAttendance = new Map();

  for (const test of allLabTests) {
    const attendanceId = test.attendanceId;
    
    if (!groupedByAttendance.has(attendanceId)) {
      groupedByAttendance.set(attendanceId, {
        attendanceId,
        patientId: test.Attendance.patientId,
        patient: {
          name: `${test.Attendance.Patient.surname} ${test.Attendance.Patient.otherNames || ''}`.trim(),
          age: this.calculateAge(test.Attendance.Patient.dateOfBirth),
          gender: test.Attendance.Patient.gender,
          folderNumber: test.Attendance.Patient.folderNumber
        },
        location: test.Attendance.Bed ? {
          ward: test.Attendance.Bed.Ward?.wardName,
          bed: test.Attendance.Bed.bedNumber
        } : undefined,
        tests: [],
        requestedCount: 0,
        inProgressCount: 0,
        completedCount: 0,
        oldestRequestedAt: test.requestedAt
      });
    }

    const group = groupedByAttendance.get(attendanceId);
    group.tests.push(test);
    
    if (test.status === 'requested') group.requestedCount++;
    else if (test.status === 'in_progress') group.inProgressCount++;
    else if (test.status === 'completed') group.completedCount++;
    
    if (new Date(test.requestedAt) < new Date(group.oldestRequestedAt)) {
      group.oldestRequestedAt = test.requestedAt;
    }
  }

  // Process groups into worklist items
  const processedItems = [];
  for (const group of groupedByAttendance.values()) {
    const hasPendingTests = group.requestedCount > 0 || group.inProgressCount > 0;
    const allCompleted = group.completedCount > 0 && group.requestedCount === 0 && group.inProgressCount === 0;
    
    let waitTime = 0;
    let priority = 'routine';
    if (hasPendingTests) {
      waitTime = Math.floor((Date.now() - new Date(group.oldestRequestedAt).getTime()) / 60000);
      const waitHours = waitTime / 60;
      if (waitHours > 48) priority = 'stat';
      else if (waitHours > 24) priority = 'urgent';
    }
    
    processedItems.push({
      id: group.attendanceId,
      patientId: group.patientId,
      attendanceId: group.attendanceId,
      patient: group.patient,
      location: group.location,
      testCount: group.tests.length,
      requestedCount: group.requestedCount,
      inProgressCount: group.inProgressCount,
      completedCount: group.completedCount,
      hasPendingTests,
      hasResults: allCompleted,
      oldestRequestedAt: group.oldestRequestedAt,
      tests: group.tests,
      waitTime,
      priority,
      status: hasPendingTests ? 'pending' : (allCompleted ? 'completed' : 'partial')
    });
  }

  return {
    total: processedItems.length,
    pending: processedItems.filter(i => i.hasPendingTests).length,
    completed: processedItems.filter(i => i.hasResults).length,
    inProgress: processedItems.filter(i => i.inProgressCount > 0).length,
    data: processedItems
  };
}

// ============================================
// PHARMACY WORKLIST - All medications with status
// ============================================
async getPharmacyWorklist(): Promise<PharmacyWorklistResponse> {
  // Get all medications with their attendance and patient info
  const allMedications = await this.prisma.medication.findMany({
    where: {
      status: { in: ['prescribed', 'dispensed'] }
    },
    include: {
      Attendance: {
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              dateOfBirth: true,
              gender: true,
              folderNumber: true
            }
          },
          Bed: {
            include: { Ward: true }
          }
        }
      },
      StockItem: true
    },
    orderBy: { prescribedAt: 'asc' }
  });

  // Group medications by attendanceId
  const groupedByAttendance = new Map<string, {
    attendanceId: string;
    patientId: string;
    patient: any;
    location: any;
    medications: any[];
    prescribedCount: number;
    dispensedCount: number;
    oldestPrescribedAt: Date;
    newestPrescribedAt: Date;
  }>();

  for (const med of allMedications) {
    const attendanceId = med.attendanceId;
    
    if (!groupedByAttendance.has(attendanceId)) {
      groupedByAttendance.set(attendanceId, {
        attendanceId: med.attendanceId,
        patientId: med.Attendance.patientId,
        patient: {
          name: `${med.Attendance.Patient.surname} ${med.Attendance.Patient.otherNames || ''}`.trim(),
          age: this.calculateAge(med.Attendance.Patient.dateOfBirth),
          gender: med.Attendance.Patient.gender,
          folderNumber: med.Attendance.Patient.folderNumber
        },
        location: med.Attendance.Bed ? {
          ward: med.Attendance.Bed.Ward?.wardName,
          bed: med.Attendance.Bed.bedNumber
        } : undefined,
        medications: [],
        prescribedCount: 0,
        dispensedCount: 0,
        oldestPrescribedAt: med.prescribedAt,
        newestPrescribedAt: med.prescribedAt
      });
    }

    const group = groupedByAttendance.get(attendanceId)!;
    group.medications.push(med);
    
    if (med.status === 'prescribed') {
      group.prescribedCount++;
    } else if (med.status === 'dispensed') {
      group.dispensedCount++;
    }
    
    // Update oldest prescription date
    if (new Date(med.prescribedAt) < new Date(group.oldestPrescribedAt)) {
      group.oldestPrescribedAt = med.prescribedAt;
    }
    // Update newest prescription date
    if (new Date(med.prescribedAt) > new Date(group.newestPrescribedAt)) {
      group.newestPrescribedAt = med.prescribedAt;
    }
  }

  // Process each group into a worklist item
  const processedItems: PharmacyWorklistItem[] = [];
  
  for (const group of groupedByAttendance.values()) {
    const hasPendingPrescriptions = group.prescribedCount > 0;
    const hasBeenDispensed = group.dispensedCount > 0 && group.prescribedCount === 0;
    const allDispensed = group.prescribedCount === 0 && group.dispensedCount > 0;
    
    // Calculate wait time based on oldest pending prescription
    let waitTime = 0;
    let priority: 'routine' | 'urgent' | 'stat' = 'routine';
    
    if (hasPendingPrescriptions) {
      waitTime = Math.floor((Date.now() - new Date(group.oldestPrescribedAt).getTime()) / 60000);
      const waitHours = waitTime / 60;
      if (waitHours > 48) priority = 'stat';
      else if (waitHours > 24) priority = 'urgent';
    }
    
    // Get the next medication to dispense (oldest prescribed)
    const nextMedication = group.medications
      .filter(m => m.status === 'prescribed')
      .sort((a, b) => new Date(a.prescribedAt).getTime() - new Date(b.prescribedAt).getTime())[0];
    
    processedItems.push({
      id: group.attendanceId,  // Use attendanceId as the unique identifier for the group
      patientId: group.patientId,
      attendanceId: group.attendanceId,
      patient: group.patient,
      location: group.location,
      prescriptionCount: group.prescribedCount + group.dispensedCount,
      prescribedCount: group.prescribedCount,
      dispensedCount: group.dispensedCount,
      hasPendingPrescriptions,
      hasBeenDispensed: allDispensed,
      oldestPrescribedAt: group.oldestPrescribedAt,
      medications: group.medications.map(m => ({
        id: m.id,
        name: m.StockItem?.name || m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        status: m.status,
        prescribedAt: m.prescribedAt,
        dispensedAt: m.dispensedAt
      })),
      nextMedication: nextMedication ? {
        id: nextMedication.id,
        name: nextMedication.StockItem?.name || nextMedication.name,
        dosage: nextMedication.dosage,
        frequency: nextMedication.frequency,
        duration: nextMedication.duration
      } : null,
      waitTime,
      priority,
      status: hasPendingPrescriptions ? 'pending' : (allDispensed ? 'dispensed' : 'partial'),
      encounterCategory: 'ipd' // or get from attendance
    });
  }

  const pending = processedItems.filter(i => i.hasPendingPrescriptions);
  const dispensed = processedItems.filter(i => i.hasBeenDispensed);

  return {
    total: processedItems.length,
    pending: pending.length,
    dispensed: dispensed.length,
    data: processedItems
  };
}

// modules/encounter/EncounterRepository.ts

// ============================================
// SCANS/RADIOLOGY WORKLIST - GROUPED BY PATIENT
// ============================================
async getRadiologyWorklist(): Promise<ScansWorklistResponse> {
  // Get all scans with their attendance and patient info
  const allScans = await this.prisma.scan.findMany({
    where: {
      status: { in: ['requested', 'in_progress', 'completed'] }
    },
    include: {
      Attendance: {
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              dateOfBirth: true,
              gender: true,
              folderNumber: true
            }
          },
          Bed: {
            include: { Ward: true }
          }
        }
      },
      ScanTemplate: true,
      User_Scan_performedByIdToUser: {
        select: { fullName: true }
      }
    },
    orderBy: { requestedAt: 'asc' }
  });

  // Group scans by attendanceId
  const groupedByAttendance = new Map<string, {
    attendanceId: string;
    patientId: string;
    patient: any;
    location: any;
    scans: any[];
    requestedCount: number;
    inProgressCount: number;
    completedCount: number;
    oldestRequestedAt: Date;
    highestPriority: string;
  }>();

  for (const scan of allScans) {
    const attendanceId = scan.attendanceId;
    
    if (!groupedByAttendance.has(attendanceId)) {
      groupedByAttendance.set(attendanceId, {
        attendanceId: scan.attendanceId,
        patientId: scan.Attendance.patientId,
        patient: {
          name: `${scan.Attendance.Patient.surname} ${scan.Attendance.Patient.otherNames || ''}`.trim(),
          age: this.calculateAge(scan.Attendance.Patient.dateOfBirth),
          gender: scan.Attendance.Patient.gender,
          folderNumber: scan.Attendance.Patient.folderNumber
        },
        location: scan.Attendance.Bed ? {
          ward: scan.Attendance.Bed.Ward?.wardName,
          bed: scan.Attendance.Bed.bedNumber
        } : undefined,
        scans: [],
        requestedCount: 0,
        inProgressCount: 0,
        completedCount: 0,
        oldestRequestedAt: scan.requestedAt,
        highestPriority: 'routine'
      });
    }

    const group = groupedByAttendance.get(attendanceId)!;
    group.scans.push(scan);
    
    if (scan.status === 'requested') group.requestedCount++;
    else if (scan.status === 'in_progress') group.inProgressCount++;
    else if (scan.status === 'completed') group.completedCount++;
    
    // Update oldest request date
    if (new Date(scan.requestedAt) < new Date(group.oldestRequestedAt)) {
      group.oldestRequestedAt = scan.requestedAt;
    }
    
    // Update highest priority
    let priorityWeight = 0;
    if (scan.priority === 'stat') priorityWeight = 3;
    else if (scan.priority === 'urgent') priorityWeight = 2;
    else if (scan.priority === 'routine') priorityWeight = 1;
    
    let currentWeight = 0;
    if (group.highestPriority === 'stat') currentWeight = 3;
    else if (group.highestPriority === 'urgent') currentWeight = 2;
    else currentWeight = 1;
    
    if (priorityWeight > currentWeight) {
      group.highestPriority = scan.priority || 'routine';
    }
  }

  // Process each group into a worklist item
  const processedItems: ScansWorklistItem[] = [];
  
  for (const group of groupedByAttendance.values()) {
    const hasPendingScans = group.requestedCount > 0 || group.inProgressCount > 0;
    const allCompleted = group.completedCount > 0 && group.requestedCount === 0 && group.inProgressCount === 0;
    
    // Calculate wait time based on oldest pending scan
    let waitTime = 0;
    let priority: 'routine' | 'urgent' | 'stat' = group.highestPriority as any;
    
    if (hasPendingScans) {
      waitTime = Math.floor((Date.now() - new Date(group.oldestRequestedAt).getTime()) / 60000);
      const waitHours = waitTime / 60;
      if (priority !== 'stat' && waitHours > 48) priority = 'stat';
      else if (priority !== 'stat' && waitHours > 24 && priority !== 'urgent') priority = 'urgent';
    }
    
    // Get next scan to perform (oldest requested)
    const nextScan = group.scans
      .filter(s => s.status === 'requested')
      .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())[0];
    
    processedItems.push({
      id: group.attendanceId,
      patientId: group.patientId,
      attendanceId: group.attendanceId,
      patient: group.patient,
      location: group.location,
      scanCount: group.scans.length,
      requestedCount: group.requestedCount,
      inProgressCount: group.inProgressCount,
      completedCount: group.completedCount,
      hasPendingScans,
      hasResults: allCompleted,
      oldestRequestedAt: group.oldestRequestedAt,
      scanTypes: group.scans.map(s => s.ScanTemplate?.name || s.scanType || 'Unknown').join(', '),
      nextScan: nextScan ? {
        id: nextScan.id,
        name: nextScan.ScanTemplate?.name || nextScan.scanType,
        bodyPart: nextScan.bodyPart,
        requestedAt: nextScan.requestedAt
      } : null,
      waitTime,
      priority,
      status: hasPendingScans ? 'pending' : (allCompleted ? 'completed' : 'partial'),
      encounterCategory: 'ipd'
    });
  }

  const pending = processedItems.filter(i => i.hasPendingScans);
  const inProgress = processedItems.filter(i => i.inProgressCount > 0);
  const completed = processedItems.filter(i => i.hasResults);

  return {
    total: processedItems.length,
    pending: pending.length,
    completed: completed.length,
    inProgress: inProgress.length,
    data: processedItems
  };
}

// ============================================
// THEATRE/PROCEDURES WORKLIST - GROUPED BY PATIENT
// ============================================

async getProceduresWorklist(): Promise<TheatreWorklistResponse> {
  // Get all procedures with their attendance and patient info (only scheduled and completed)
  const allProcedures = await this.prisma.procedure.findMany({
    where: {
      status: { in: ['scheduled', 'completed'] }  // ✅ Remove 'in_progress'
    },
    include: {
      Attendance: {
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              dateOfBirth: true,
              gender: true,
              folderNumber: true
            }
          },
          Bed: {
            include: { Ward: true }
          }
        }
      },
      ProcedureTemplate: true,
      User_Procedure_performedByIdToUser: {
        select: { fullName: true }
      }
    },
    orderBy: { scheduledDate: 'asc' }
  });

  // Group procedures by attendanceId
  const groupedByAttendance = new Map<string, {
    attendanceId: string;
    patientId: string;
    patient: any;
    location: any;
    procedures: any[];
    scheduledCount: number;
    completedCount: number;
    earliestScheduledDate: Date | null;
  }>();

  for (const procedure of allProcedures) {
    const attendanceId = procedure.attendanceId;
    
    if (!groupedByAttendance.has(attendanceId)) {
      groupedByAttendance.set(attendanceId, {
        attendanceId: procedure.attendanceId,
        patientId: procedure.Attendance.patientId,
        patient: {
          name: `${procedure.Attendance.Patient.surname} ${procedure.Attendance.Patient.otherNames || ''}`.trim(),
          age: this.calculateAge(procedure.Attendance.Patient.dateOfBirth),
          gender: procedure.Attendance.Patient.gender,
          folderNumber: procedure.Attendance.Patient.folderNumber
        },
        location: procedure.Attendance.Bed ? {
          ward: procedure.Attendance.Bed.Ward?.wardName,
          bed: procedure.Attendance.Bed.bedNumber
        } : undefined,
        procedures: [],
        scheduledCount: 0,
        completedCount: 0,
        earliestScheduledDate: null
      });
    }

    const group = groupedByAttendance.get(attendanceId)!;
    group.procedures.push(procedure);
    
    if (procedure.status === 'scheduled') group.scheduledCount++;
    else if (procedure.status === 'completed') group.completedCount++;
    
    if (procedure.scheduledDate) {
      if (!group.earliestScheduledDate || new Date(procedure.scheduledDate) < new Date(group.earliestScheduledDate)) {
        group.earliestScheduledDate = procedure.scheduledDate;
      }
    }
  }

  // Process each group into a worklist item
  const processedItems: TheatreWorklistItem[] = [];
  
  for (const group of groupedByAttendance.values()) {
    const hasPendingProcedures = group.scheduledCount > 0;
    const hasBeenPerformed = group.completedCount > 0 && group.scheduledCount === 0;
    
    // Calculate wait time
    let waitTime = 0;
    let priority: 'routine' | 'urgent' | 'stat' = 'routine';
    
    if (hasPendingProcedures && group.earliestScheduledDate) {
      waitTime = Math.floor((new Date(group.earliestScheduledDate).getTime() - Date.now()) / 60000);
      waitTime = Math.max(0, waitTime);
      
      const isOverdue = new Date(group.earliestScheduledDate) < new Date();
      if (isOverdue) {
        const overdueHours = Math.abs(waitTime) / 60;
        if (overdueHours > 24) priority = 'stat';
        else if (overdueHours > 12) priority = 'urgent';
      } else {
        const waitHours = waitTime / 60;
        if (waitHours < 1) priority = 'stat';
        else if (waitHours < 6) priority = 'urgent';
      }
    }
    
    // Get next scheduled procedure
    const nextProcedure = group.procedures
      .filter(p => p.status === 'scheduled')
      .sort((a, b) => {
        const dateA = a.scheduledDate || a.createdAt;
        const dateB = b.scheduledDate || b.createdAt;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })[0];
    
    processedItems.push({
      id: group.attendanceId,
      patientId: group.patientId,
      attendanceId: group.attendanceId,
      patient: group.patient,
      location: group.location,
      procedureCount: group.procedures.length,
      scheduledCount: group.scheduledCount,
      inProgressCount: 0,  // Always 0 since we removed in_progress
      completedCount: group.completedCount,
      hasPendingProcedures,
      hasBeenPerformed,
      earliestScheduledDate: group.earliestScheduledDate,
      procedureNames: group.procedures.map(p => p.ProcedureTemplate?.name || 'Unknown').join(', '),
      nextProcedure: nextProcedure ? {
        id: nextProcedure.id,
        name: nextProcedure.ProcedureTemplate?.name || 'Unknown',
        scheduledDate: nextProcedure.scheduledDate,
        status: nextProcedure.status
      } : null,
      waitTime,
      priority,
      status: hasBeenPerformed ? 'completed' : 'scheduled',
      encounterCategory: 'ipd'
    });
  }

  const scheduled = processedItems.filter(i => i.status === 'scheduled');
  const completed = processedItems.filter(i => i.status === 'completed');

  return {
    total: processedItems.length,
    scheduled: scheduled.length,
    inProgress: 0,  // Always 0
    completed: completed.length,
    data: processedItems
  };
}

// ============================================
// MATERNAL WORKLIST - Antenatal, Delivery, Postnatal
// ============================================
async getMaternalWorklist(): Promise<MaternalWorklistResponse> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get ALL active maternal encounters (antenatal, delivery, postnatal)
  const maternalAttendances = await this.prisma.attendance.findMany({
    where: {
      status: { in: ['pending', 'admitted'] },
      attendanceType: { in: ['antenatal', 'delivery', 'postnatal'] },
      encounterCategory: { in: ['opd', 'ipd', 'daycase'] }
    },
    include: {
      Patient: {
        select: {
          id: true,
          surname: true,
          otherNames: true,
          dateOfBirth: true,
          gender: true,
          folderNumber: true,
          contact: true
        }
      },
      Bed: {
        include: { Ward: true }
      },
      Vitals: {
        orderBy: { recordedAt: 'desc' },
        take: 1
      }
      // ❌ REMOVE AntenatalBooking - it's not a direct relation
      // AntenatalBooking will need to be fetched separately if needed
    },
    orderBy: { dateTime: 'asc' }
  });

  // Process each attendance
  const processedItems: MaternalWorklistItem[] = [];
  
  for (const attendance of maternalAttendances) {
    const visitType = attendance.attendanceType as 'antenatal' | 'delivery' | 'postnatal';
    const lastVitals = attendance.Vitals?.[0];
    const hasBeenAttended = attendance.status === 'completed' || attendance.status === 'discharged';
    const completedToday = hasBeenAttended && 
      new Date(attendance.updatedAt).toDateString() === today.toDateString();
    
    // Calculate wait time (only for pending)
    const waitTime = !hasBeenAttended
      ? Math.floor((Date.now() - new Date(attendance.dateTime).getTime()) / 60000)
      : 0;
    
    // Calculate priority based on wait time and risk
    let priority: 'routine' | 'urgent' | 'stat' = 'routine';
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    // For antenatal, fetch risk level separately if needed
    if (visitType === 'antenatal') {
      try {
        const antenatalBooking = await this.prisma.antenatalBooking.findFirst({
          where: { attendanceId: attendance.id }
        });
        if (antenatalBooking) {
          riskLevel = (antenatalBooking as any).riskLevel || 'low';
        }
      } catch (err) {
        // If AntenatalBooking doesn't exist, ignore
        console.log('No antenatal booking found for attendance:', attendance.id);
      }
    }
    
    if (!hasBeenAttended) {
      const waitHours = waitTime / 60;
      if (riskLevel === 'high') {
        priority = 'stat';
      } else if (riskLevel === 'medium') {
        priority = 'urgent';
      } else if (waitHours > 48) {
        priority = 'stat';
      } else if (waitHours > 24) {
        priority = 'urgent';
      }
    }
    
    // Check for abnormal vitals (for antenatal)
    let hasAbnormalVitals = false;
    if (visitType === 'antenatal' && lastVitals) {
      hasAbnormalVitals = (
        (lastVitals.bloodPressure && (() => {
          const [sys] = lastVitals.bloodPressure.split('/').map(Number);
          return sys > 140 || sys < 90;
        })()) ||
        ((lastVitals as any).fetalHeartRate && ((lastVitals as any).fetalHeartRate < 110 || (lastVitals as any).fetalHeartRate > 160))
      );
      if (hasAbnormalVitals && priority !== 'stat') {
        priority = 'urgent';
      }
    }
    
    processedItems.push({
      id: attendance.id,
      patientId: attendance.patientId,
      attendanceId: attendance.id,
      patient: {
        name: `${attendance.Patient.surname} ${attendance.Patient.otherNames || ''}`.trim(),
        age: this.calculateAge(attendance.Patient.dateOfBirth),
        gender: attendance.Patient.gender,
        folderNumber: attendance.Patient.folderNumber
      },
      location: attendance.Bed ? {
        ward: attendance.Bed.Ward?.wardName,
        bed: attendance.Bed.bedNumber
      } : undefined,
      visitType,
      status: attendance.status,
      hasBeenAttended: completedToday,
      completedAt: completedToday ? attendance.updatedAt : undefined,
      waitTime,
      priority,
      riskLevel,
      encounterCategory: attendance.encounterCategory,
      // Antenatal specific
      gestationalAge: (attendance as any).gestationalAgeWeeks,
      edd: (attendance as any).edd,
      // Delivery specific
      deliveryDate: (attendance as any).deliveryDate,
      deliveryType: (attendance as any).deliveryType,
      // Postnatal specific
      postnatalDay: (attendance as any).postnatalDay,
      complaints: attendance.complaints,
      latestVitals: lastVitals ? {
        bloodPressure: lastVitals.bloodPressure,
        temperature: lastVitals.temperature,
        pulse: lastVitals.pulse,
        fetalHeartRate: (lastVitals as any).fetalHeartRate,
        fundalHeight: (lastVitals as any).fundalHeight
      } : undefined
    });
  }

  const pending = processedItems.filter(i => !i.hasBeenAttended);
  const recent = processedItems.filter(i => i.hasBeenAttended);

  console.log(`Maternal Worklist: ${pending.length} pending, ${recent.length} recent`);
  console.log(`Breakdown - Antenatal: ${processedItems.filter(i => i.visitType === 'antenatal').length}, Delivery: ${processedItems.filter(i => i.visitType === 'delivery').length}, Postnatal: ${processedItems.filter(i => i.visitType === 'postnatal').length}`);

  return {
    total: processedItems.length,
    pending: pending.length,
    recent: recent.length,
    data: processedItems
  };
}

// ============================================
// HELPER: Calculate Priority based on wait time
// ============================================
private calculatePriority(date: Date): 'routine' | 'urgent' | 'stat' {
  const waitHours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  if (waitHours > 48) return 'stat';
  if (waitHours > 24) return 'urgent';
  return 'routine';
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