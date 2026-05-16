// backend/src/modules/worklist/WorklistRepository.ts

import { PrismaClient } from '@prisma/client';
import { WorklistItem } from './WorklistTypes';
import { BaseService } from '../../shared/base/BaseService';

export class WorklistRepository extends BaseService {
  private prisma: PrismaClient;

  constructor() {
    super('WorklistRepository');
    this.prisma = new PrismaClient();
  }

  async getVitalsWorklist() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find admissions without vitals recorded today
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
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            phone: true
          }
        },
        ward: { select: { name: true } }
      },
      orderBy: { admittedAt: 'asc' }
    });

    return admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        ...admission.patient,
        age: this.calculateAge(admission.patient.dateOfBirth)
      },
      wardName: admission.ward?.name || 'General',
      admittedAt: admission.admittedAt,
      priority: 'normal',
      status: 'pending_vitals',
      waitTimeMinutes: this.calculateWaitTime(admission.admittedAt)
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
        medicalNotes: {
          none: {
            createdAt: { gte: today }
          }
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true
          }
        },
        ward: { select: { name: true } },
        vitals: {
          where: { recordedAt: { gte: today } },
          orderBy: { recordedAt: 'asc' },
          take: 1
        }
      },
      orderBy: { admittedAt: 'asc' }
    });

    return admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        ...admission.patient,
        age: this.calculateAge(admission.patient.dateOfBirth)
      },
      wardName: admission.ward?.name || 'General',
      admittedAt: admission.admittedAt,
      priority: this.calculatePriority(admission.vitals[0]),
      status: 'pending_consultation',
      vitalsSummary: admission.vitals[0] ? 
        `${admission.vitals[0].bpSys}/${admission.vitals[0].bpDia} mmHg, HR: ${admission.vitals[0].heartRate}` : null,
      waitTimeMinutes: this.calculateWaitTime(admission.admittedAt)
    }));
  }

  async getLaboratoryWorklist() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingRequests = await this.prisma.labRequest.findMany({
      where: {
        status: { in: ['ordered', 'collected'] },
        createdAt: { gte: today }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true
          }
        },
        tests: {
          select: {
            id: true,
            testName: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return pendingRequests.map(request => ({
      id: request.id,
      patientId: request.patientId,
      attendanceId: request.attendanceId,
      attendanceNumber: request.attendance?.attendanceNumber,
      patient: {
        ...request.patient,
        age: this.calculateAge(request.patient.dateOfBirth)
      },
      departmentName: 'Laboratory',
      admittedAt: request.createdAt,
      priority: request.priority || 'normal',
      status: request.status,
      tests: request.tests.map(t => t.testName),
      waitTimeMinutes: this.calculateWaitTime(request.createdAt)
    }));
  }

  async getPharmacyWorklist() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingPrescriptions = await this.prisma.prescription.findMany({
      where: {
        status: { in: ['pending', 'partially_dispensed'] },
        createdAt: { gte: today }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true
          }
        },
        prescriptionItems: {
          include: {
            medication: {
              select: {
                name: true,
                dosage: true,
                form: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return pendingPrescriptions.map(prescription => ({
      id: prescription.id,
      patientId: prescription.patientId,
      attendanceId: prescription.attendanceId,
      attendanceNumber: prescription.attendance?.attendanceNumber,
      patient: {
        ...prescription.patient,
        age: this.calculateAge(prescription.patient.dateOfBirth)
      },
      departmentName: 'Pharmacy',
      admittedAt: prescription.createdAt,
      priority: prescription.priority || 'normal',
      status: prescription.status,
      medications: prescription.prescriptionItems.map(item => 
        `${item.medication.name} ${item.medication.dosage} ${item.medication.form}`
      ),
      waitTimeMinutes: this.calculateWaitTime(prescription.createdAt)
    }));
  }

  async getRadiologyWorklist() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingScans = await this.prisma.radiologyRequest.findMany({
      where: {
        status: { in: ['pending', 'scheduled'] },
        createdAt: { gte: today }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return pendingScans.map(request => ({
      id: request.id,
      patientId: request.patientId,
      attendanceId: request.attendanceId,
      attendanceNumber: request.attendance?.attendanceNumber,
      patient: {
        ...request.patient,
        age: this.calculateAge(request.patient.dateOfBirth)
      },
      departmentName: 'Radiology',
      admittedAt: request.createdAt,
      priority: request.priority || 'normal',
      status: request.status,
      modality: request.modality,
      bodyPart: request.bodyPart,
      waitTimeMinutes: this.calculateWaitTime(request.createdAt)
    }));
  }

  async getTheatreWorklist() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use Procedure model with surgery templates for theatre cases
    const pendingSurgeries = await this.prisma.procedure.findMany({
      where: {
        status: { in: ['scheduled', 'pending'] },
        scheduledDate: { gte: today },
        templateId: { contains: 'surgery' } // Filter for surgery procedures
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true
          }
        },
        attendance: {
          select: {
            id: true,
            ward: { select: { name: true } }
          }
        },
        performedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    return pendingSurgeries.map(procedure => ({
      id: procedure.id,
      patientId: procedure.attendance.patientId,
      patient: {
        ...procedure.patient,
        age: this.calculateAge(procedure.patient.dateOfBirth)
      },
      wardName: procedure.attendance.ward?.name || 'Pre-op',
      departmentName: 'Theatre',
      admittedAt: procedure.scheduledDate,
      priority: 'urgent',
      status: procedure.status,
      procedureName: procedure.templateId,
      surgeon: procedure.performedBy ? `${procedure.performedBy.firstName} ${procedure.performedBy.lastName}` : 'TBD',
      waitTimeMinutes: this.calculateWaitTime(procedure.scheduledDate)
    }));
  }

  async getProceduresWorklist() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingProcedures = await this.prisma.procedure.findMany({
      where: {
        status: { in: ['scheduled', 'pending'] },
        scheduledDate: { gte: today }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true
          }
        },
        performedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    return pendingProcedures.map(procedure => ({
      id: procedure.id,
      patientId: procedure.attendance.patientId,
      attendanceId: procedure.attendanceId,
      attendanceNumber: procedure.attendance?.attendanceNumber,
      patient: {
        ...procedure.patient,
        age: this.calculateAge(procedure.patient.dateOfBirth)
      },
      departmentName: 'Procedures',
      admittedAt: procedure.scheduledDate,
      priority: 'normal',
      status: procedure.status,
      procedureName: procedure.templateId,
      performer: procedure.performedBy ? `${procedure.performedBy.firstName} ${procedure.performedBy.lastName}` : 'TBD',
      waitTimeMinutes: this.calculateWaitTime(procedure.scheduledDate)
    }));
  }

  private calculateAge(dateOfBirth?: Date): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private calculateWaitTime(startTime?: Date): number {
    if (!startTime) return 0;
    const now = new Date();
    const start = new Date(startTime);
    return Math.floor((now.getTime() - start.getTime()) / 60000); // minutes
  }

  private calculatePriority(vitals: any): 'low' | 'normal' | 'urgent' | 'stat' {
    if (!vitals) return 'normal';
    
    // Simple priority calculation based on vitals
    const sys = vitals.bpSys || 120;
    const dia = vitals.bpDia || 80;
    const hr = vitals.heartRate || 70;
    const temp = vitals.temperature || 37;

    if (sys > 180 || sys < 90 || dia > 120 || dia < 60 || hr > 140 || hr < 40 || temp > 39.5) {
      return 'stat';
    }
    if (sys > 160 || sys < 100 || dia > 100 || dia < 70 || hr > 120 || hr < 50 || temp > 38.5) {
      return 'urgent';
    }
    if (sys > 140 || dia > 90 || hr > 100 || temp > 38) {
      return 'normal';
    }
    return 'low';
  }
}
