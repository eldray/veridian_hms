// modules/encounter/EncounterService.ts

import { PrismaClient } from '@prisma/client';
import { EncounterRepository } from './EncounterRepository';
import { getCounterService } from '../../services/CounterService';
import { 
  CreateEncounterDTO, 
  UpdateEncounterDTO, 
  AddDiagnosisDTO, 
  AddVitalsDTO, 
  AddPrescriptionDTO, 
  AddLabTestDTO, 
  AddScanDTO, 
  AddProcedureDTO, 
  AddServiceDTO,
  CreateAdmissionDTO,
  AddDailyNoteDTO,
  DetentionPatientFilters,
  ConvertDetentionToIPDDTO
} from './EncounterTypes';

export class EncounterService {
  private repository: EncounterRepository;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.repository = new EncounterRepository(this.prisma);
  }

  // ============================================
  // CREATE ENCOUNTER (UPDATED with detention logic)
  // ============================================
  async createEncounter(data: CreateEncounterDTO, userId: string) {
    // Validate NHIS CCC if payment mode is NHIS
    if (data.paymentMode === 'nhis' && !data.nhisCCC) {
      throw new Error('NHIS CCC number is required for NHIS payments');
    }

    // Validate Corporate Account if payment mode is Corporate
    if (data.paymentMode === 'corporate' && !data.corporateAccountId) {
      throw new Error('Corporate Account ID is required for corporate payments');
    }

    // ✅ NEW: Determine encounter category and admission type based on stay duration
    let encounterCategory = data.encounterCategory || 'opd';
    let admissionType = data.admissionType;
    let shouldCreateAdmission = false;

    // Day Surgery (same day discharge, <12 hours)
    if (data.expectedStayHours && data.expectedStayHours <= 12) {
      encounterCategory = 'daycase';
      shouldCreateAdmission = false;
    }
    // Detention/Observation (12-72 hours)
    else if (data.isObservation || (data.expectedStayHours && data.expectedStayHours > 12 && data.expectedStayHours <= 72)) {
      encounterCategory = 'ipd';
      admissionType = 'detention_observation';
      shouldCreateAdmission = true;
    }
    // Formal IPD (>72 hours or specified)
    else if (data.expectedStayHours && data.expectedStayHours > 72) {
      encounterCategory = 'ipd';
      admissionType = data.admissionType || 'emergency';
      shouldCreateAdmission = true;
    }
    // If admission type is specified directly
    else if (data.admissionType && data.admissionType !== 'detention_observation') {
      encounterCategory = 'ipd';
      admissionType = data.admissionType;
      shouldCreateAdmission = true;
    }

    // Set default encounterCategory if not provided
    if (!data.encounterCategory && !encounterCategory) {
      encounterCategory = 'opd';
    }

    // Validate bed/ward for IPD and daycase
    if (encounterCategory !== 'opd') {
      if (!data.bedId) {
        throw new Error(`${encounterCategory.toUpperCase()} requires a bed assignment`);
      }
      if (!data.wardId) {
        throw new Error(`${encounterCategory.toUpperCase()} requires a ward assignment`);
      }
      
      // Verify bed is available
      const bed = await this.prisma.bed.findUnique({
        where: { id: data.bedId },
        include: { Ward: true }
      });
      
      if (!bed) throw new Error('Bed not found');
      if (bed.isOccupied) throw new Error('Bed is already occupied');
      if (bed.wardId !== data.wardId) throw new Error('Bed does not belong to specified ward');
    }

    // Auto-link NHIS provider if needed
    let insuranceProviderId = data.insuranceProviderId;
    if (data.paymentMode === 'nhis' && !insuranceProviderId) {
      const nhisProvider = await this.prisma.insuranceProvider.findFirst({
        where: { type: 'nhis', isActive: true }
      });
      if (nhisProvider) {
        insuranceProviderId = nhisProvider.id;
      }
    }

    // For cash and corporate payments, ensure no insurance provider
    if (data.paymentMode === 'cash' || data.paymentMode === 'corporate') {
      insuranceProviderId = null;
    }

    // Create the encounter
    const encounter = await this.repository.create(
      { 
        ...data, 
        insuranceProviderId,
        encounterCategory 
      },
      userId
    );

    // If bed assigned, mark as occupied
    if (data.bedId) {
      await this.prisma.bed.update({
        where: { id: data.bedId },
        data: { isOccupied: true, currentPatientId: data.patientId }
      });
      
      // Update ward occupancy
      await this.prisma.ward.update({
        where: { id: data.wardId! },
        data: { occupiedBeds: { increment: 1 } }
      });
    }

    // ✅ NEW: Create admission record for IPD (including detention)
    if (shouldCreateAdmission && encounterCategory === 'ipd') {
      await this.createFormalAdmission({
        attendanceId: encounter.id,
        admissionType: admissionType || 'emergency',
        admissionSource: data.admissionSource || 'opd',
        admissionDate: new Date()
      }, userId);
    }

    // ✅ NEW: Update attendance with admission type for easy filtering
    if (admissionType) {
      await this.prisma.attendance.update({
        where: { id: encounter.id },
        data: { admissionType: admissionType }
      });
    }

    return encounter;
  }

  // ============================================
  // CREATE FORMAL ADMISSION (Updated)
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

    // Must be IPD category (including detention)
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

    // Create admission record
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
            Bed: true,
            Ward: true
          }
        }
      }
    });

    // Update attendance with admission type
    await this.prisma.attendance.update({
      where: { id: data.attendanceId },
      data: { admissionType: admission.admissionType }
    });

    return admission;
  }

  // ============================================
  // ✅ NEW: GET DETENTION/OBSERVATION PATIENTS
  // ============================================
  async getDetentionPatients(filters: DetentionPatientFilters = {}) {
    const where: any = {
      encounterCategory: 'ipd',
      status: 'admitted',
      Admission: {
        admissionType: 'detention_observation'
      }
    };

    if (filters.wardId) {
      where.wardId = filters.wardId;
    }

    if (filters.status === 'discharged') {
      where.status = 'discharged';
    } else if (filters.status === 'active') {
      where.status = 'admitted';
    }

    const page = filters.page || 1;
    const limit = Math.min(100, filters.limit || 50);
    const skip = (page - 1) * limit;

    const [encounters, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: {
          Patient: true,
          Ward: true,
          Bed: true,
          Admission: true,
          Vitals: {
            orderBy: { recordedAt: 'desc' },
            take: 5
          },
          AttendanceDiagnosis: {
            include: { Diagnosis: true },
            take: 3
          }
        },
        orderBy: { dateTime: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.attendance.count({ where })
    ]);

    // Calculate observation hours and determine if ready for decision
    const now = new Date();
    const processedEncounters = encounters.map(encounter => {
      const admissionDate = encounter.Admission?.admissionDate || encounter.dateTime;
      const observationHours = Math.floor((now.getTime() - new Date(admissionDate).getTime()) / (1000 * 60 * 60));
      
      // Ready for decision if >24 hours observation OR unstable vitals
      const recentVitals = encounter.Vitals || [];
      const hasAbnormalVitals = recentVitals.some((v: any) => 
        (v.temperature && (v.temperature > 38.5 || v.temperature < 36)) ||
        (v.pulse && (v.pulse > 120 || v.pulse < 50)) ||
        (v.spo2 && v.spo2 < 92)
      );
      
      const readyForDecision = observationHours >= 24 || hasAbnormalVitals || 
                               (filters.readyForDecision === true);

      return {
        ...encounter,
        observationHours,
        readyForDecision,
        patientName: `${encounter.Patient.surname} ${encounter.Patient.otherNames || ''}`.trim(),
        age: this.calculateAge(encounter.Patient.dateOfBirth),
        vitalsCount: recentVitals.length,
        diagnosisCount: encounter.AttendanceDiagnosis?.length || 0,
        lastVitalsAt: recentVitals[0]?.recordedAt
      };
    });

    // Filter by observation hours if specified
    let filteredData = processedEncounters;
    if (filters.observationHours) {
      filteredData = processedEncounters.filter(e => e.observationHours >= filters.observationHours!);
    }
    if (filters.readyForDecision === true) {
      filteredData = processedEncounters.filter(e => e.readyForDecision);
    }

    return {
      data: filteredData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalDetention: filteredData.length,
        readyForDecision: filteredData.filter((e: any) => e.readyForDecision).length,
        avgObservationHours: filteredData.reduce((acc: number, e: any) => acc + e.observationHours, 0) / (filteredData.length || 1)
      }
    };
  }

  // ============================================
  // ✅ NEW: GET FORMAL IPD PATIENTS (excluding detention)
  // ============================================
  async getFormalIPDPatients(filters: {
    status?: 'active' | 'discharged';
    wardId?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {
      encounterCategory: 'ipd',
      Admission: {
        admissionType: { not: 'detention_observation' }
      }
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
          Patient: true,
          Ward: true,
          Bed: true,
          Admission: true,
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
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  // ============================================
  // ✅ NEW: CONVERT DETENTION TO FORMAL IPD
  // ============================================
  async convertDetentionToFormalIPD(encounterId: string, data: ConvertDetentionToIPDDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      include: { Admission: true, Patient: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.encounterCategory !== 'ipd') {
      throw new Error('Only IPD encounters can be converted');
    }

    if (!encounter.Admission || encounter.Admission.admissionType !== 'detention_observation') {
      throw new Error('Only detention/observation patients can be converted to formal IPD');
    }

    if (encounter.status !== 'admitted') {
      throw new Error('Cannot convert non-admitted patient');
    }

    // Update admission type
    const updatedAdmission = await this.prisma.admission.update({
      where: { id: encounter.Admission.id },
      data: {
        admissionType: data.admissionType,
        dailyNotes: [
          ...(encounter.Admission.dailyNotes as any[] || []),
          {
            id: Date.now().toString(),
            notes: `Converted from detention observation to formal IPD. ${data.clinicalNotes || ''} Reason: ${data.decisionReason || 'Clinical decision'}`,
            noteType: 'conversion',
            createdBy: userId,
            createdAt: new Date().toISOString()
          }
        ]
      }
    });

    // Update attendance
    await this.prisma.attendance.update({
      where: { id: encounterId },
      data: { 
        admissionType: data.admissionType,
        medicalNotes: `${encounter.medicalNotes || ''}\n\n[${new Date().toISOString()}] Converted to formal IPD - ${data.decisionReason || 'Clinical decision'}`
      }
    });

    // Create notification for ward staff
    await this.prisma.notification.create({
      data: {
        userId: userId, // Will be expanded to all ward staff
        title: 'Patient Converted to Formal IPD',
        message: `${encounter.Patient.surname} ${encounter.Patient.otherNames} has been converted from detention observation to formal IPD (${data.admissionType})`,
        type: 'clinical',
        priority: 'high',
        actionType: 'admission',
        actionId: encounterId,
        actionUrl: `/admissions/${encounter.Admission.id}`
      }
    });

    return {
      success: true,
      admission: updatedAdmission,
      message: `Patient converted to formal IPD (${data.admissionType})`
    };
  }

  // ============================================
  // GET ALL ADMISSIONS (Updated with filtering)
  // ============================================
  async getAllAdmissions(filters: {
    status?: 'active' | 'discharged';
    wardId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
    admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
    excludeDetention?: boolean;
  }) {
    const where: any = {
      attendance: {
        encounterCategory: 'ipd',
        Admission: { isNot: null }
      }
    };

    if (filters.status === 'active') {
      where.attendance.status = 'admitted';
      where.dischargeDate = null;
    } else if (filters.status === 'discharged') {
      where.attendance.status = 'discharged';
      where.dischargeDate = { not: null };
    }

    if (filters.wardId) {
      where.attendance.wardId = filters.wardId;
    }

    if (filters.admissionType) {
      where.admissionType = filters.admissionType;
    }

    if (filters.excludeDetention) {
      where.admissionType = { not: 'detention_observation' };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.admissionDate = {};
      if (filters.dateFrom) where.admissionDate.gte = filters.dateFrom;
      if (filters.dateTo) where.admissionDate.lte = filters.dateTo;
    }

    const page = filters.page || 1;
    const limit = Math.min(100, filters.limit || 50);
    const skip = (page - 1) * limit;

    const [admissions, total] = await Promise.all([
      this.prisma.admission.findMany({
        where,
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
        },
        orderBy: { admissionDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.admission.count({ where })
    ]);

    return {
      data: admissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  // ============================================
  // CONVERT DAYCASE TO IPD (Updated)
  // ============================================
  async convertDaycaseToIPD(encounterId: string, admissionData: CreateAdmissionDTO, userId: string) {
    // Get the encounter
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.encounterCategory !== 'daycase') {
      throw new Error('Only daycase encounters can be converted to IPD');
    }

    // Update encounter category to IPD
    await this.prisma.attendance.update({
      where: { id: encounterId },
      data: { 
        encounterCategory: 'ipd',
        admissionType: admissionData.admissionType || 'emergency'
      }
    });

    // Create formal admission
    return this.createFormalAdmission({
      ...admissionData,
      attendanceId: encounterId,
      admissionType: admissionData.admissionType || 'detention_observation' // Daycase conversion often starts as observation
    }, userId);
  }

  // ============================================
  // DISCHARGE FROM ENCOUNTER (Updated)
  // ============================================
  async dischargeFromEncounter(encounterId: string, dischargeData: {
    dischargeDate?: Date;
    dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
    dischargeSummary?: string;
  }, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      include: { Admission: true, Bed: true, Patient: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.encounterCategory === 'opd') {
      throw new Error('OPD encounters do not require discharge');
    }

    if (encounter.status === 'discharged') {
      throw new Error('Patient already discharged');
    }

    const dischargeDate = dischargeData.dischargeDate || new Date();
    const wasDetention = encounter.Admission?.admissionType === 'detention_observation';

    // Update encounter
    await this.prisma.attendance.update({
      where: { id: encounterId },
      data: {
        status: 'discharged',
        bedId: null
      }
    });

    // If formal admission exists, update it
    if (encounter.Admission) {
      await this.prisma.admission.update({
        where: { id: encounter.Admission.id },
        data: {
          dischargeDate,
          dischargeStatus: dischargeData.dischargeStatus || 'home',
          dailyNotes: [
            ...(encounter.Admission.dailyNotes as any[] || []),
            {
              id: Date.now().toString(),
              notes: `Patient discharged. Status: ${dischargeData.dischargeStatus || 'home'}. Summary: ${dischargeData.dischargeSummary || 'No summary provided'}`,
              noteType: 'discharge',
              createdBy: userId,
              createdAt: new Date().toISOString()
            }
          ]
        }
      });
    }

    // Free the bed
    if (encounter.bedId) {
      await this.prisma.bed.update({
        where: { id: encounter.bedId },
        data: { isOccupied: false, currentPatientId: null }
      });
      
      // Update ward occupancy
      if (encounter.wardId) {
        await this.prisma.ward.update({
          where: { id: encounter.wardId },
          data: { occupiedBeds: { decrement: 1 } }
        });
      }
    }

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId: userId,
        title: wasDetention ? 'Patient Discharged from Observation' : 'Patient Discharged',
        message: `${encounter.Patient.surname} ${encounter.Patient.otherNames} has been discharged. Status: ${dischargeData.dischargeStatus || 'home'}`,
        type: 'clinical',
        priority: 'medium',
        actionType: 'discharge',
        actionId: encounterId
      }
    });

    return { 
      message: 'Patient discharged successfully', 
      dischargeDate,
      wasDetention
    };
  }

  // ============================================
  // ADD DAILY NOTES TO ADMISSION (Updated)
  // ============================================
  async addDailyNotes(encounterId: string, data: AddDailyNoteDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      include: { Admission: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (!encounter.Admission) {
      throw new Error('No formal admission record found for this encounter');
    }

    const currentNotes = (encounter.Admission.dailyNotes as any[]) || [];
    
    const newNote = {
      id: Date.now().toString(),
      notes: data.notes,
      noteType: data.noteType || 'general',
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    const updatedNotes = [...currentNotes, newNote];

    await this.prisma.admission.update({
      where: { id: encounter.Admission.id },
      data: { dailyNotes: updatedNotes }
    });

    return { note: newNote };
  }

  // ============================================
  // GET DAYCASE/OBSERVATION PATIENTS (Original - for day surgery only)
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
          Patient: true,
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
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  // ============================================
  // GET BED OCCUPANCY (Updated with distinction)
  // ============================================
  async getBedOccupancy() {
    const occupants = await this.prisma.attendance.findMany({
      where: {
        bedId: { not: null },
        status: { in: ['admitted', 'in_progress'] }
      },
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            gender: true,
            dateOfBirth: true
          }
        },
        Bed: {
          include: { Ward: true }
        },
        Admission: true
      },
      orderBy: { dateTime: 'asc' }
    });

    const summary = {
      total: occupants.length,
      byCategory: {
        ipd: occupants.filter(o => o.encounterCategory === 'ipd').length,
        daycase: occupants.filter(o => o.encounterCategory === 'daycase').length,
        detention: occupants.filter(o => o.Admission?.admissionType === 'detention_observation').length,
        formalIPD: occupants.filter(o => o.encounterCategory === 'ipd' && o.Admission?.admissionType !== 'detention_observation').length
      },
      byWard: occupants.reduce((acc: any, o) => {
        const wardName = o.Bed?.Ward?.wardName || 'Unknown';
        if (!acc[wardName]) {
          acc[wardName] = { total: 0, ipd: 0, daycase: 0, detention: 0, formalIPD: 0 };
        }
        acc[wardName].total++;
        if (o.encounterCategory === 'ipd') acc[wardName].ipd++;
        if (o.encounterCategory === 'daycase') acc[wardName].daycase++;
        if (o.Admission?.admissionType === 'detention_observation') acc[wardName].detention++;
        if (o.encounterCategory === 'ipd' && o.Admission?.admissionType !== 'detention_observation') acc[wardName].formalIPD++;
        return acc;
      }, {})
    };

    return { data: occupants, summary };
  }

  // ============================================
  // UPDATE ENCOUNTER
  // ============================================
  async updateEncounter(id: string, data: UpdateEncounterDTO, userId: string) {
    const updateData = {
      ...data,
      updatedById: userId,
      updatedAt: new Date()
    };
    
    return this.repository.update(id, updateData);
  }

  // ============================================
  // GET ENCOUNTER BY ID
  // ============================================
  async getEncounterById(id: string) {
    const encounter = await this.repository.findById(id);
    if (!encounter) {
      throw new Error('Encounter not found');
    }
    return encounter;
  }

  // ============================================
  // GET ALL ENCOUNTERS WITH FILTERS
  // ============================================
  async getEncounters(filters: any) {
    return this.repository.findMany(filters);
  }

  // ============================================
  // UPDATE ENCOUNTER STATUS
  // ============================================
  async updateEncounterStatus(id: string, status: string) {
    const validStatuses = ['pending', 'admitted', 'completed', 'discharged', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return this.repository.update(id, { status: status as any });
  }

  // ============================================
  // ADD DIAGNOSIS
  // ============================================
  async addDiagnosis(encounterId: string, data: AddDiagnosisDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add diagnosis to ${encounter.status} encounter`);
    }

    return this.repository.addDiagnosis(encounterId, data, userId);
  }

  // ============================================
  // SET PRIMARY DIAGNOSIS
  // ============================================
  async setPrimaryDiagnosis(encounterId: string, diagnosisId: string, userId: string) {
    return this.addDiagnosis(encounterId, {
      diagnosisId,
      diagnosisType: 'primary'
    }, userId);
  }

  // ============================================
  // REMOVE DIAGNOSIS
  // ============================================
  async removeDiagnosis(encounterId: string, diagnosisId: string) {
    return this.prisma.attendanceDiagnosis.delete({
      where: {
        attendanceId_diagnosisId: {
          attendanceId: encounterId,
          diagnosisId
        }
      }
    });
  }

  // ============================================
  // GET VITALS BY ENCOUNTER
  // ============================================
  async getVitalsByEncounter(encounterId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { id: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    const vitals = await this.prisma.vitals.findMany({
      where: { attendanceId: encounterId },
      include: { User: { select: { fullName: true } } },
      orderBy: { recordedAt: 'desc' }
    });

    return vitals;
  }

  // ============================================
  // ADD VITALS
  // ============================================
  async addVitals(encounterId: string, data: AddVitalsDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add vitals to ${encounter.status} encounter`);
    }

    return this.repository.addVitals(encounterId, data, userId);
  }

  // ============================================
  // UPDATE VITALS
  // ============================================
  async updateVitals(vitalsId: string, data: Partial<AddVitalsDTO>) {
    const updateData: any = {};
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.bloodPressure !== undefined) updateData.bloodPressure = data.bloodPressure;
    if (data.pulse !== undefined) updateData.pulse = data.pulse;
    if (data.respiration !== undefined) updateData.respiration = data.respiration;
    if (data.spo2 !== undefined) updateData.spo2 = data.spo2;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.muac !== undefined) updateData.muac = data.muac;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.vitals.update({
      where: { id: vitalsId },
      data: updateData
    });
  }

  // ============================================
  // DELETE VITALS
  // ============================================
  async deleteVitals(vitalsId: string) {
    return this.prisma.vitals.delete({
      where: { id: vitalsId }
    });
  }

  // ============================================
  // ADD PRESCRIPTION
  // ============================================
  async addPrescription(encounterId: string, data: AddPrescriptionDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add prescription to ${encounter.status} encounter`);
    }

    const stockItem = await this.prisma.stockItem.findUnique({
      where: { id: data.stockItemId }
    });

    if (!stockItem) {
      throw new Error('Stock item not found');
    }

    const serviceCatalog = await this.prisma.serviceCatalog.findUnique({
      where: { id: data.serviceCatalogId }
    });

    if (!serviceCatalog || serviceCatalog.serviceType !== 'medication') {
      throw new Error('Invalid service catalog item for medication');
    }

    return this.repository.addPrescription(encounterId, data, userId);
  }

  // ============================================
  // DISPENSE MEDICATION
  // ============================================
  async dispenseMedication(
    encounterId: string,
    medicationId: string,
    quantity: number,
    userId: string,
    batchNumber?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const medication = await tx.medication.findUnique({
        where: { id: medicationId },
        include: { StockItem: true }
      });

      if (!medication) {
        throw new Error('Medication not found');
      }

      if (medication.status !== 'prescribed') {
        throw new Error('Medication is not in prescribed state');
      }

      const stockItem = medication.StockItem;
      if (!stockItem) {
        throw new Error('Stock item not found for this medication');
      }

      if (stockItem.currentStock < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${stockItem.currentStock}, Required: ${quantity}`
        );
      }

      await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { currentStock: stockItem.currentStock - quantity }
      });

      const updatedMedication = await tx.medication.update({
        where: { id: medicationId },
        data: {
          status: 'dispensed',
          quantity,
          dispensedAt: new Date(),
          dispensedById: userId,
          dispensedBatchNumber: batchNumber || null,
          dispensedUnitCost: stockItem.costPrice
        }
      });

      await tx.stockTransaction.create({
        data: {
          stockItemId: stockItem.id,
          transactionType: 'sale',
          quantity,
          balanceAfter: stockItem.currentStock - quantity,
          reference: `Dispensed from encounter ${encounterId}`,
          performedBy: userId,
          notes: `Medication: ${medication.name}`
        }
      });

      return updatedMedication;
    });
  }

  // ============================================
  // REMOVE MEDICATION
  // ============================================
  async removeMedication(encounterId: string, medicationId: string) {
    return this.prisma.medication.delete({
      where: {
        id: medicationId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // ADD LAB TEST
  // ============================================
  async addLabTest(encounterId: string, data: AddLabTestDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add lab test to ${encounter.status} encounter`);
    }

    const labTest = await this.repository.addLabTest(encounterId, data, userId);

    const labTestTemplate = await this.prisma.labTestTemplate.findUnique({
      where: { id: data.templateId },
      include: { ServiceCatalog: true }
    });

    if (labTestTemplate?.ServiceCatalog) {
      await this.addServiceToBill(encounterId, labTestTemplate.ServiceCatalog.id, userId);
    }

    return labTest;
  }

  // ============================================
  // UPDATE LAB TEST STATUS
  // ============================================
  async updateLabTestStatus(labTestId: string, status: string, results?: any, performedById?: string) {
    const validStatuses = ['requested', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status };
    if (results) updateData.result = results;
    if (performedById) updateData.performedById = performedById;
    if (status === 'completed') updateData.completedAt = new Date();

    return this.prisma.labTest.update({
      where: { id: labTestId },
      data: updateData
    });
  }

  // ============================================
  // REMOVE LAB TEST
  // ============================================
  async removeLabTest(encounterId: string, labTestId: string) {
    return this.prisma.labTest.delete({
      where: {
        id: labTestId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // ADD SCAN
  // ============================================
  async addScan(encounterId: string, data: AddScanDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add scan to ${encounter.status} encounter`);
    }

    const scan = await this.repository.addScan(encounterId, data, userId);
    await this.addServiceToBill(encounterId, data.serviceCatalogId, userId);

    return scan;
  }

  // ============================================
  // UPDATE SCAN STATUS
  // ============================================
  async updateScanStatus(scanId: string, status: string, results?: any, performedById?: string) {
    const validStatuses = ['requested', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status };
    if (results) updateData.result = results;
    if (performedById) updateData.performedById = performedById;
    if (status === 'completed') updateData.completedAt = new Date();

    return this.prisma.scan.update({
      where: { id: scanId },
      data: updateData
    });
  }

  // ============================================
  // REMOVE SCAN
  // ============================================
  async removeScan(encounterId: string, scanId: string) {
    return this.prisma.scan.delete({
      where: {
        id: scanId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // ADD PROCEDURE
  // ============================================
  async addProcedure(encounterId: string, data: AddProcedureDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add procedure to ${encounter.status} encounter`);
    }

    const procedure = await this.repository.addProcedure(encounterId, data, userId);
    await this.addServiceToBill(encounterId, data.serviceCatalogId, userId);

    return procedure;
  }

  // ============================================
  // UPDATE PROCEDURE STATUS
  // ============================================
  async updateProcedureStatus(procedureId: string, status: string, performedById?: string) {
    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status };
    if (performedById) updateData.performedById = performedById;
    if (status === 'completed') updateData.completedAt = new Date();

    return this.prisma.procedure.update({
      where: { id: procedureId },
      data: updateData
    });
  }

  // ============================================
  // REMOVE PROCEDURE
  // ============================================
  async removeProcedure(encounterId: string, procedureId: string) {
    return this.prisma.procedure.delete({
      where: {
        id: procedureId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // ADD SERVICE TO ENCOUNTER
  // ============================================
  async addService(encounterId: string, data: AddServiceDTO, userId: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id: encounterId },
      select: { status: true }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.status === 'completed' || encounter.status === 'discharged' || encounter.status === 'cancelled') {
      throw new Error(`Cannot add service to ${encounter.status} encounter`);
    }

    await this.repository.addService(encounterId, data, userId);
    return encounter;
  }

  // ============================================
  // REMOVE SERVICE FROM ENCOUNTER
  // ============================================
  async removeService(encounterId: string, serviceRenderedId: string) {
    return this.prisma.serviceRendered.delete({
      where: {
        id: serviceRenderedId,
        attendanceId: encounterId
      }
    });
  }

  // ============================================
  // GET WORKLISTS
  // ============================================
  async getVitalsWorklist() {
    return this.repository.getVitalsWorklist();
  }

  async getMedicalWorklist() {
    return this.repository.getMedicalWorklist();
  }

  async getLabWorklist() {
    return this.repository.getLabWorklist();
  }

  async getPharmacyWorklist() {
    return this.repository.getPharmacyWorklist();
  }

  async getRadiologyWorklist() {
    return this.repository.getRadiologyWorklist();
  }

  async getProceduresWorklist() {
    return this.repository.getProceduresWorklist();
  }

  async getMaternalWorklist(): Promise<MaternalWorklistResponse> {
    return this.repository.getMaternalWorklist();
  }

  // ============================================
  // HELPER: Add Service to Bill
  // ============================================
  private async addServiceToBill(encounterId: string, serviceCatalogId: string, userId: string) {
    const existingService = await this.prisma.serviceRendered.findFirst({
      where: {
        attendanceId: encounterId,
        serviceItemId: serviceCatalogId
      }
    });

    if (existingService) {
      return;
    }

    await this.prisma.serviceRendered.create({
      data: {
        attendanceId: encounterId,
        serviceItemId: serviceCatalogId,
        quantity: 1,
        date: new Date(),
        performedById: userId
      }
    });
  }

  // ============================================
  // DELETE ENCOUNTER
  // ============================================
  async deleteEncounter(id: string) {
    const encounter = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        Medication: { take: 1 },
        LabTest: { take: 1 },
        Scan: { take: 1 },
        Procedure: { take: 1 },
        ServiceRendered: { take: 1 },
        AttendanceDiagnosis: { take: 1 },
        Vitals: { take: 1 },
        Bill: true
      }
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    if (encounter.Medication.length > 0 || 
        encounter.LabTest.length > 0 || 
        encounter.Scan.length > 0 || 
        encounter.Procedure.length > 0 || 
        encounter.ServiceRendered.length > 0 ||
        encounter.AttendanceDiagnosis.length > 0 ||
        encounter.Vitals.length > 0 ||
        encounter.Bill) {
      throw new Error('Cannot delete encounter with related records. Please remove all services first.');
    }

    return this.prisma.attendance.delete({
      where: { id }
    });
  }

  // ============================================
  // GET ENCOUNTER STATISTICS
  // ============================================
  async getEncounterStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = dateFrom;
      if (dateTo) where.dateTime.lte = dateTo;
    }

    const [total, byType, byStatus, byPaymentMode, byAdmissionType] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.groupBy({
        by: ['attendanceType'],
        where,
        _count: true
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      this.prisma.attendance.groupBy({
        by: ['paymentMode'],
        where,
        _count: true
      }),
      this.prisma.attendance.groupBy({
        by: ['admissionType'],
        where: { ...where, admissionType: { not: null } },
        _count: true
      })
    ]);

    return {
      total,
      byType: byType.map(item => ({ type: item.attendanceType, count: item._count })),
      byStatus: byStatus.map(item => ({ status: item.status, count: item._count })),
      byPaymentMode: byPaymentMode.map(item => ({ mode: item.paymentMode, count: item._count })),
      byAdmissionType: byAdmissionType.map(item => ({ type: item.admissionType, count: item._count }))
    };
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