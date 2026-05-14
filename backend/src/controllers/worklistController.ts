import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Get worklist for Vitals/Triage department
 * Returns patients who are admitted/checked-in but missing vitals for today
 */
export const getVitalsWorklist = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find admissions without vitals recorded today
    const admissions = await prisma.admission.findMany({
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

    const worklist = admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        ...admission.patient,
        age: calculateAge(admission.patient.dateOfBirth)
      },
      wardName: admission.ward?.name || 'General',
      admittedAt: admission.admittedAt,
      priority: 'normal', // Could be calculated based on condition
      status: 'pending_vitals'
    }));

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching vitals worklist:', error);
    throw new AppError('Failed to fetch vitals worklist', 500);
  }
};

/**
 * Get worklist for Medical/Doctor consultation
 * Returns patients who have vitals but no doctor notes for today
 */
export const getMedicalWorklist = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const admissions = await prisma.admission.findMany({
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
          take: 1,
          orderBy: { recordedAt: 'desc' }
        }
      },
      orderBy: { admittedAt: 'asc' }
    });

    const worklist = admissions.map(admission => ({
      id: admission.id,
      patientId: admission.patientId,
      patient: {
        ...admission.patient,
        age: calculateAge(admission.patient.dateOfBirth)
      },
      wardName: admission.ward?.name || 'General',
      lastVitals: admission.vitals[0] ? {
        bp: admission.vitals[0].bloodPressure,
        hr: admission.vitals[0].heartRate,
        temp: admission.vitals[0].temperature
      } : null,
      status: 'pending_consultation'
    }));

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching medical worklist:', error);
    throw new AppError('Failed to fetch medical worklist', 500);
  }
};

/**
 * Get worklist for Laboratory
 * Returns patients with pending lab requests
 */
export const getLabWorklist = async (req: Request, res: Response) => {
  try {
    const pendingRequests = await prisma.labRequest.findMany({
      where: {
        status: 'pending'
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
        requestedBy: {
          select: { firstName: true, lastName: true }
        },
        tests: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const worklist = pendingRequests.map(request => ({
      id: request.id,
      patientId: request.patientId,
      patient: {
        ...request.patient,
        age: calculateAge(request.patient.dateOfBirth)
      },
      requestId: request.id,
      tests: request.tests.map(t => t.name),
      testCount: request.tests.length,
      requestedBy: `${request.requestedBy.firstName} ${request.requestedBy.lastName}`,
      requestedAt: request.createdAt,
      priority: request.priority || 'normal',
      status: 'pending_lab'
    }));

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching lab worklist:', error);
    throw new AppError('Failed to fetch lab worklist', 500);
  }
};

/**
 * Get worklist for Pharmacy
 * Returns patients with pending prescriptions
 */
export const getPharmacyWorklist = async (req: Request, res: Response) => {
  try {
    const pendingPrescriptions = await prisma.prescription.findMany({
      where: {
        status: 'pending'
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
        prescribedBy: {
          select: { firstName: true, lastName: true }
        },
        items: {
          include: {
            medication: {
              select: { name: true, stock: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const worklist = pendingPrescriptions.map(prescription => ({
      id: prescription.id,
      patientId: prescription.patientId,
      patient: {
        ...prescription.patient,
        age: calculateAge(prescription.patient.dateOfBirth)
      },
      prescriptionId: prescription.id,
      items: prescription.items.map(item => ({
        medicationName: item.medication.name,
        dosage: item.dosage,
        frequency: item.frequency,
        inStock: item.medication.stock > 0
      })),
      itemCount: prescription.items.length,
      prescribedBy: `${prescription.prescribedBy.firstName} ${prescription.prescribedBy.lastName}`,
      prescribedAt: prescription.createdAt,
      status: 'pending_pharmacy'
    }));

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pharmacy worklist:', error);
    throw new AppError('Failed to fetch pharmacy worklist', 500);
  }
};

/**
 * Get worklist for Scans/Radiology
 * Returns patients with pending scan requests
 */
export const getScanWorklist = async (req: Request, res: Response) => {
  try {
    const pendingScans = await prisma.scanRequest.findMany({
      where: {
        status: 'pending'
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
        requestedBy: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const worklist = pendingScans.map(request => ({
      id: request.id,
      patientId: request.patientId,
      patient: {
        ...request.patient,
        age: calculateAge(request.patient.dateOfBirth)
      },
      scanType: request.scanType,
      bodyPart: request.bodyPart,
      clinicalNote: request.clinicalNote,
      requestedBy: `${request.requestedBy.firstName} ${request.requestedBy.lastName}`,
      requestedAt: request.createdAt,
      priority: request.priority || 'normal',
      status: 'pending_scan'
    }));

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching scan worklist:', error);
    throw new AppError('Failed to fetch scan worklist', 500);
  }
};

/**
 * Get worklist for Theatre/OT
 * Returns patients with scheduled surgeries/procedures
 */
export const getTheatreWorklist = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const surgeries = await prisma.surgery.findMany({
      where: {
        scheduledDate: {
          gte: today,
          lt: tomorrow
        },
        status: { in: ['scheduled', 'pre_op'] }
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
        surgeon: {
          select: { firstName: true, lastName: true }
        },
        admission: {
          select: { ward: { select: { name: true } } }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    const worklist = surgeries.map(surgery => ({
      id: surgery.id,
      patientId: surgery.patientId,
      patient: {
        ...surgery.patient,
        age: calculateAge(surgery.patient.dateOfBirth)
      },
      procedureName: surgery.procedureName,
      scheduledDate: surgery.scheduledDate,
      surgeon: `${surgery.surgeon.firstName} ${surgery.surgeon.lastName}`,
      wardName: surgery.admission?.ward?.name || 'N/A',
      status: 'pending_theatre',
      priority: surgery.priority || 'normal'
    }));

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching theatre worklist:', error);
    throw new AppError('Failed to fetch theatre worklist', 500);
  }
};

// Helper function to calculate age
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
