// controllers/admissionController.ts - UPDATED VERSION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, AdmissionType } from '@prisma/client'; // ✅ ADDED AdmissionType
const prisma = new PrismaClient();
import { NotificationService } from '../services/NotificationService';

// ==============================
// GET ALL ADMISSIONS - UPDATED
// ==============================
export const getAdmissions = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      wardId, 
      patientId, 
      dateFrom, 
      dateTo,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const where: any = {};
    
    if (status) where.status = status as string;
    if (wardId) where.wardId = wardId as string;
    if (patientId) where.patientId = patientId as string;
    
    if (dateFrom || dateTo) {
      where.admissionDate = {};
      if (dateFrom) where.admissionDate.gte = new Date(dateFrom as string);
      if (dateTo) where.admissionDate.lte = new Date(dateTo as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

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
              paymentMode: true
            }
          },
          Ward: {
            select: {
              wardName: true,
              wardType: true
              // ✅ REMOVED: cashDailyRate, insuranceDailyRate (not in schema)
            }
          },
          Bed: {
            select: {
              bedNumber: true
            }
          },
          Diagnosis: { // ✅ FIXED: Use "Diagnosis" not "principalDiagnosis"
            select: {
              name: true,
              icdCode: true,
            }
          },
          Attendance: {
            select: {
              attendanceNumber: true,
              dateTime: true
            }
          }
        },
        orderBy: {
          admissionDate: 'desc'
        },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.admission.count({ where })
    ]);

    // ✅ ADDED: Add fullName to patient objects
    const admissionsWithFullName = admissions.map(admission => ({
      ...admission,
      patient: admission.Patient ? {
        ...admission.Patient,
        fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim()
      } : null
    }));

    res.json({
      admissions: admissionsWithFullName,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching admissions:', error);
    res.status(500).json({ 
      message: 'Error fetching admissions', 
      error: (error as Error).message 
    });
  }
};

// ==============================
// CREATE NEW ADMISSION - UPDATED
// ==============================
export const createAdmission = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('wardId').notEmpty().withMessage('Ward ID is required'),
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('admittingDoctor').notEmpty().withMessage('Admitting doctor is required'),
  body('reasonForAdmission').notEmpty().withMessage('Reason for admission is required'),
  body('principalDiagnosisId').notEmpty().withMessage('Principal diagnosis is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        patientId,
        wardId,
        bedId,
        attendanceId,
        ...admissionData
      } = req.body;

      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'User authentication required' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Validate bed availability
        const bed = await tx.bed.findUnique({
          where: { id: bedId },
          include: { Ward: true }
        });

        if (!bed) throw new Error('Bed not found');
        if (bed.isOccupied) throw new Error('Bed not available');
        if (bed.wardId !== wardId) throw new Error('Bed does not belong to specified ward');

        // Check if patient already has active admission
        const existingAdmission = await tx.admission.findFirst({
          where: {
            patientId: patientId,
            status: 'admitted'
          }
        });

        if (existingAdmission) {
          throw new Error('Patient already has an active admission');
        }

        // If attendanceId provided, validate it exists and belongs to patient
        if (attendanceId) {
          const attendance = await tx.attendance.findUnique({
            where: { id: attendanceId }
          });
          
          if (!attendance) throw new Error('Attendance record not found');
          if (attendance.patientId !== patientId) throw new Error('Attendance does not belong to patient');
          
          // Update attendance status to 'admitted'
          await tx.attendance.update({
            where: { id: attendanceId },
            data: { status: 'admitted' }
          });
        }

        // Generate admission number
        const admissionCount = await tx.admission.count({
          where: {
            admissionDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
            }
          }
        });
        
        const admissionNumber = `ADM-${String(admissionCount + 1).padStart(6, '0')}`;

        // Get principal diagnosis info
        const principalDiagnosis = await tx.diagnosis.findUnique({
          where: { id: admissionData.principalDiagnosisId }
        });

        if (!principalDiagnosis) {
          throw new Error('Principal diagnosis not found');
        }

        // ✅ UPDATED: Use AdmissionType enum with detention_observation
        const admissionType = (admissionData.admissionType as AdmissionType) || 'emergency';

        // Create admission
        const admission = await tx.admission.create({
          data: {
            admissionNumber,
            patientId,
            wardId,
            bedId,
            attendanceId,
            principalDiagnosisId: admissionData.principalDiagnosisId,
            principalIcdCode: principalDiagnosis.icdCode,
            admittingDoctor: admissionData.admittingDoctor,
            reasonForAdmission: admissionData.reasonForAdmission,
            diagnosis: admissionData.diagnosis || principalDiagnosis.name,
            admissionDate: admissionData.admissionDate ? new Date(admissionData.admissionDate) : new Date(),
            admissionTime: admissionData.admissionTime || new Date().toTimeString().slice(0, 5),
            status: 'admitted',
            admissionType: admissionType, // ✅ UPDATED
            admissionSource: admissionData.admissionSource || 'home',
            principalPresentOnAdmission: admissionData.principalPresentOnAdmission || 'Y',
            createdBy: user.id, // ✅ UPDATED: user.id instead of (req as any).user?.id
          },
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true,
                contact: true,
                paymentMode: true
              }
            },
            Ward: {
              select: {
                wardName: true,
                wardType: true
              }
            },
            Bed: {
              select: {
                bedNumber: true
              }
            },
            Diagnosis: { // ✅ FIXED: Use "Diagnosis" not "principalDiagnosis"
              select: {
                name: true,
                icdCode: true,
              }
            },
            Attendance: {
              select: {
                attendanceNumber: true,
                dateTime: true
              }
            }
          }
        });

        // Update bed occupancy
        await tx.bed.update({
          where: { id: bedId },
          data: {
            isOccupied: true,
            currentPatientId: patientId
          }
        });

        // Update ward occupancy
        await tx.ward.update({
          where: { id: wardId },
          data: {
            occupiedBeds: { increment: 1 }
          }
        });

        return admission;
      });

      // ✅ MODIFIED: Add fullName to the response
      const resultWithFullName = {
        ...result,
        patient: result.Patient ? {
          ...result.Patient,
          fullName: `${result.Patient.surname} ${result.Patient.otherNames}`.trim()
        } : null
      };

      // Send notifications
      await NotificationService.sendAdmissionNotifications(result.id);

      res.status(201).json({
        message: 'Admission created successfully',
        admission: resultWithFullName,
        relationship: result.attendanceId ? 
          'Extended from attendance' : 'Direct admission'
      });

    } catch (error) {
      console.error('Error creating admission:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('not available') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('already has an active admission')) {
        return res.status(400).json({ message: errorMessage });
      }
      
      res.status(500).json({ 
        message: 'Error creating admission', 
        error: errorMessage 
      });
    }
  }
];

// ==============================
// GET ADMISSION BY ID - UPDATED
// ==============================
export const getAdmissionById = async (req: Request, res: Response) => {
  try {
    const admission = await prisma.admission.findUnique({
      where: { id: req.params.id },
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
                coveragePercentage: true
              }
            }
          }
        },
        Ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true
          }
        },
        Bed: {
          select: {
            id: true,
            bedNumber: true,
            isOccupied: true
          }
        },
        Diagnosis: { 
          select: {
            name: true,
            icdCode: true,
          }
        },
        AdmissionSecondaryDiagnosis: {
          include: {
            Diagnosis: {
              select: {
                name: true,
              }
            }
          }  
        },
        Attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            paymentMode: true,
            nhisCCC: true
          }
        },
        Bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            status: true
          }
        }
      }
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    // ✅ ADDED: Add fullName to patient
    const admissionWithFullName = {
      ...admission,
      patient: admission.Patient ? {
        ...admission.Patient,
        fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim()
      } : null
    };

    res.json(admissionWithFullName);
  } catch (error) {
    console.error('Error fetching admission:', error);
    res.status(500).json({ 
      message: 'Error fetching admission', 
      error: (error as Error).message 
    });
  }
};

// ==============================
// UPDATE ADMISSION - UPDATED
// ==============================
export const updateAdmission = [
  body('status')
    .optional()
    .isIn(['admitted', 'discharged', 'transferred'])
    .withMessage('Invalid status'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await prisma.$transaction(async (tx) => {
        const admission = await tx.admission.update({
          where: { id: req.params.id },
          data: {
            ...req.body,
            updatedAt: new Date()
          },
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true,
                contact: true
              }
            },
            Ward: {
              select: {
                wardName: true,
                wardType: true
              }
            },
            Bed: {
              select: {
                bedNumber: true
              }
            }
          }
        });

        if (!admission) {
          throw new Error('Admission not found');
        }

        // When a patient is discharged, free up the bed
        if (req.body.status === 'discharged') {
          await tx.bed.update({
            where: { id: admission.bedId },
            data: {
              isOccupied: false,
              currentPatientId: null
            }
          });

          // Decrease ward occupancy
          await tx.ward.update({
            where: { id: admission.wardId },
            data: {
              occupiedBeds: {
                decrement: 1
              }
            }
          });

          // Update attendance status if attendanceId exists
          if (admission.attendanceId) {
            await tx.attendance.update({
              where: { id: admission.attendanceId },
              data: { status: 'discharged' }
            });
          }
        }

        // ✅ ADDED: Add fullName to response
        const resultWithFullName = {
          ...admission,
          patient: admission.Patient ? {
            ...admission.Patient,
            fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim()
          } : null
        };

        

        return resultWithFullName;
      });

      res.json({
        message: 'Admission updated successfully',
        admission: result
      });
    } catch (error) {
      console.error('Error updating admission:', error);
      if ((error as Error).message === 'Admission not found') {
        return res.status(404).json({ message: 'Admission not found' });
      }
      res.status(500).json({ 
        message: 'Error updating admission', 
        error: (error as Error).message 
      });
    }
  }
];

// ==============================
// DELETE ADMISSION - UPDATED
// ==============================
export const deleteAdmission = async (req: Request, res: Response) => {
  try {
    const admission = await prisma.admission.findUnique({
      where: { id: req.params.id },
      include: {
        Bed: true,
        Ward: true,
        Patient: {
          select: {
            surname: true,
            otherNames: true
          }
        }
      }
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    // Free up the bed if admission is active
    if (admission.status === 'admitted') {
      await prisma.bed.update({
        where: { id: admission.bedId },
        data: {
          isOccupied: false,
          currentPatientId: null
        }
      });

      // Decrease ward occupancy
      await prisma.ward.update({
        where: { id: admission.wardId },
        data: {
          occupiedBeds: {
            decrement: 1
          }
        }
      });
    }

    await prisma.admission.delete({
      where: { id: req.params.id }
    });

    // ✅ ADDED: Calculate fullName for response
    const patientFullName = admission.Patient ? 
      `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim() : 
      'Unknown Patient';

    res.json({ 
      message: 'Admission deleted successfully',
      deletedAdmission: {
        id: admission.id,
        admissionNumber: admission.admissionNumber,
        patientName: patientFullName,
        status: admission.status
      }
    });
  } catch (error) {
    console.error('Error deleting admission:', error);
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ message: 'Admission not found' });
    }
    res.status(500).json({ 
      message: 'Error deleting admission', 
      error: (error as Error).message 
    });
  }
};

// ==============================
// UPDATE ADMISSION WITH NHIS IPD DATA - UPDATED
// ==============================
export const updateAdmissionWithNHISData = [
  body('principalDiagnosisId').notEmpty().withMessage('Principal diagnosis is required'),
  body('principalPresentOnAdmission').isIn(['Y', 'N', 'U']).withMessage('Valid POA indicator required'),
  body('admissionType').isIn(['elective', 'emergency', 'transfer', 'detention_observation']).withMessage('Valid admission type required'), // ✅ UPDATED: Added detention_observation
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        principalDiagnosisId,
        principalPresentOnAdmission,
        admissionType,
        admissionSource,
        dischargeStatus,
        secondaryDiagnoses
      } = req.body;

      // ✅ ADDED: Validate principal diagnosis exists
      const principalDiagnosis = await prisma.diagnosis.findUnique({
        where: { id: principalDiagnosisId }
      });

      if (!principalDiagnosis) {
        return res.status(404).json({ message: 'Principal diagnosis not found' });
      }

      const admission = await prisma.admission.update({
        where: { id: req.params.id },
        data: {
          principalDiagnosisId,
          principalIcdCode: principalDiagnosis.icdCode,
          principalPresentOnAdmission,
          admissionType,
          admissionSource: admissionSource || 'home',
          dischargeStatus,
          updatedAt: new Date()
        },
        include: {
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          Ward: true,
          Bed: true,
          Diagnosis: true
        }
      });

      // Handle secondary diagnoses if provided
      if (secondaryDiagnoses && Array.isArray(secondaryDiagnoses)) {
        // Delete existing secondary diagnoses
        await prisma.admissionSecondaryDiagnosis.deleteMany({
          where: { admissionId: req.params.id }
        });

        // Create new secondary diagnoses
        for (const secondaryDiag of secondaryDiagnoses) {
          if (secondaryDiag.diagnosisId && secondaryDiag.icdCode) {
            await prisma.admissionSecondaryDiagnosis.create({
              data: {
                admissionId: req.params.id,
                diagnosisId: secondaryDiag.diagnosisId,
                icdCode: secondaryDiag.icdCode,
                presentOnAdmission: secondaryDiag.presentOnAdmission || 'U',
                diagnosisType: secondaryDiag.diagnosisType || 'comorbidity'
              }
            });
          }
        }
      }

      const updatedAdmission = await prisma.admission.findUnique({
        where: { id: req.params.id },
        include: {
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          Ward: true,
          Bed: true,
  Diagnosis: { // ✅ FIXED: Use "Diagnosis" not "principalDiagnosis"
    select: {
      name: true,
      icdCode: true,
    }
  },
  AdmissionSecondaryDiagnosis: {
    include: {
      Diagnosis: {
        select: {
          name: true,
        }
      }
    }
  }
        }
      });

      // ✅ ADDED: Add fullName to response
      const admissionWithFullName = updatedAdmission ? {
        ...updatedAdmission,
        patient: updatedAdmission.Patient ? {
          ...updatedAdmission.Patient,
          fullName: `${updatedAdmission.Patient.surname} ${updatedAdmission.Patient.otherNames}`.trim()
        } : null
      } : null;

      res.json({
        message: 'Admission updated with NHIS data successfully',
        admission: admissionWithFullName
      });
    } catch (error) {
      console.error('Error updating admission with NHIS data:', error);
      if ((error as any).code === 'P2025') {
        return res.status(404).json({ message: 'Admission not found' });
      }
      res.status(500).json({ 
        message: 'Error updating admission with NHIS data', 
        error: (error as Error).message 
      });
    }
  }
];

// ==============================
// DISCHARGE PATIENT WITH NHIS DATA - UPDATED
// ==============================
export const dischargePatient = [
  body('dischargeDate').isISO8601().withMessage('Valid discharge date required'),
  body('dischargeStatus').isIn(['home', 'transfer', 'expired', 'against_medical_advice']).withMessage('Valid discharge status required'),
  body('dischargeSummary').optional().isString().withMessage('Discharge summary must be a string'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      // In dischargePatient controller
        const pendingTasks = await tx.labTest.count({
          where: { attendanceId: admission.attendanceId, status: { not: 'completed' } }
        });
        if (pendingTasks > 0) {
          throw new Error(`Cannot discharge: ${pendingTasks} pending lab tests`);
        }
      const { 
        dischargeDate, 
        dischargeTime, 
        dischargeStatus, 
        dischargeSummary,
        lengthOfStay 
      } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const admission = await tx.admission.findUnique({
          where: { id: req.params.id },
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
              }
            },
            Ward: true,
            Bed: true
          }
        });

        if (!admission) {
          throw new Error('Admission not found');
        }

        // Calculate length of stay if not provided
        const calculatedLengthOfStay = lengthOfStay || 
          Math.ceil((new Date(dischargeDate).getTime() - admission.admissionDate.getTime()) / (1000 * 60 * 60 * 24));

        const updatedAdmission = await tx.admission.update({
          where: { id: req.params.id },
          data: {
            dischargeDate: new Date(dischargeDate),
            dischargeTime: dischargeTime || '00:00',
            dischargeStatus,
            dischargeSummary,
            lengthOfStay: calculatedLengthOfStay,
            status: 'discharged',
            updatedAt: new Date()
          },
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
              }
            },
            Ward: true,
            Bed: true,
           Diagnosis: true
          }
        });

        // Free up the bed
        await tx.bed.update({
          where: { id: admission.bedId },
          data: {
            isOccupied: false,
            currentPatientId: null
          }
        });

        // Update ward occupancy
        await tx.ward.update({
          where: { id: admission.wardId },
          data: {
            occupiedBeds: {
              decrement: 1
            }
          }
        });

        // Update attendance status if attendanceId exists
        if (admission.attendanceId) {
          await tx.attendance.update({
            where: { id: admission.attendanceId },
            data: { status: 'discharged' }
          });
        }

        // ✅ ADDED: Add fullName to response
        const resultWithFullName = {
          ...updatedAdmission,
          patient: updatedAdmission.Patient ? {
            ...updatedAdmission.Patient,
            fullName: `${updatedAdmission.Patient.surname} ${updatedAdmission.Patient.otherNames}`.trim()
          } : null
        };

        return resultWithFullName;
      });

      // Send discharge notifications
      await NotificationService.sendDischargeNotifications(req.params.id);

      res.json({
        message: 'Patient discharged successfully',
        admission: result,
        lengthOfStay: result.lengthOfStay
      });

    } catch (error) {
      console.error('Error discharging patient:', error);
      if ((error as any).code === 'P2025') {
        return res.status(404).json({ message: 'Admission not found' });
      }
      res.status(500).json({ 
        message: 'Error discharging patient', 
        error: (error as Error).message 
      });
    }
  }
];

// ==============================
// ADD DAILY NOTES TO ADMISSION - UPDATED
// ==============================
export const addDailyNotes = [
  body('notes').notEmpty().withMessage('Daily notes are required'),
  body('date').optional().isISO8601().withMessage('Valid date required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { notes, date } = req.body;
      const admissionId = req.params.id;

      const admission = await prisma.admission.findUnique({
        where: { id: admissionId }
      });

      if (!admission) {
        return res.status(404).json({ message: 'Admission not found' });
      }

      // Get existing daily notes or initialize
      const existingNotes = admission.dailyNotes as any || {};
      const noteDate = date || new Date().toISOString().split('T')[0];
      
      // Add new note
      const updatedNotes = {
        ...existingNotes,
        [noteDate]: {
          notes,
          recordedBy: (req as any).user?.id,
          recordedAt: new Date()
        }
      };

      const updatedAdmission = await prisma.admission.update({
        where: { id: admissionId },
        data: {
          dailyNotes: updatedNotes,
          updatedAt: new Date()
        },
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

      // ✅ ADDED: Add fullName to response
      const admissionWithFullName = updatedAdmission ? {
        ...updatedAdmission,
        patient: updatedAdmission.Patient ? {
          ...updatedAdmission.Patient,
          fullName: `${updatedAdmission.Patient.surname} ${updatedAdmission.Patient.otherNames}`.trim()
        } : null
      } : null;

      res.json({
        message: 'Daily notes added successfully',
        admission: admissionWithFullName,
        noteDate: noteDate
      });
    } catch (error) {
      console.error('Error adding daily notes:', error);
      res.status(500).json({ 
        message: 'Error adding daily notes', 
        error: (error as Error).message 
      });
    }
  }
];

// ==============================
// GET ADMISSION STATISTICS - MANUAL CALCULATION VERSION
// ==============================
export const getAdmissionStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where: any = {};
    if (startDate || endDate) {
      where.admissionDate = {};
      if (startDate) where.admissionDate.gte = new Date(startDate as string);
      if (endDate) where.admissionDate.lte = new Date(endDate as string);
    }

    // Fetch all admissions matching the filter
    const admissions = await prisma.admission.findMany({
      where,
      select: {
        id: true,
        status: true,
        lengthOfStay: true,
        admissionType: true,
        wardId: true,
        admissionDate: true,
        dischargeDate: true,
        Ward: {
          select: {
            wardName: true,
            wardType: true,
            totalBeds: true,
            occupiedBeds: true
          }
        }
      }
    });

    // Calculate basic counts
    const totalAdmissions = admissions.length;
    const currentAdmissions = admissions.filter(a => a.status === 'admitted').length;
    const dischargedAdmissions = admissions.filter(a => a.status === 'discharged').length;

    // Calculate average length of stay (only for discharged with valid lengthOfStay)
    const dischargedWithLOS = admissions.filter(a => 
      a.status === 'discharged' && 
      a.lengthOfStay !== null && 
      a.lengthOfStay !== undefined && 
      a.lengthOfStay > 0
    );
    
    const averageLengthOfStay = dischargedWithLOS.length > 0
      ? dischargedWithLOS.reduce((sum, a) => sum + (a.lengthOfStay || 0), 0) / dischargedWithLOS.length
      : 0;

    // Calculate ward breakdown for current admissions
    const wardAdmissions = admissions.filter(a => a.status === 'admitted' && a.wardId);
    const wardMap = new Map();
    
    for (const admission of wardAdmissions) {
      const wardId = admission.wardId!;
      if (!wardMap.has(wardId)) {
        wardMap.set(wardId, {
          wardId: wardId,
          wardName: admission.ward?.wardName || 'Unknown',
          wardType: admission.ward?.wardType || 'Unknown',
          admissionCount: 0,
          totalBeds: admission.ward?.totalBeds || 0,
          occupiedBeds: admission.ward?.occupiedBeds || 0,
          occupancyRate: 0
        });
      }
      wardMap.get(wardId).admissionCount++;
    }
    
    // Calculate occupancy rate for each ward
    const wardBreakdown = Array.from(wardMap.values()).map(ward => ({
      ...ward,
      occupancyRate: ward.totalBeds > 0 ? Math.round((ward.occupiedBeds / ward.totalBeds) * 100) : 0
    }));

    // Calculate admission type breakdown
    const typeMap = new Map();
    for (const admission of admissions) {
      if (admission.admissionType) {
        const type = admission.admissionType;
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      }
    }
    
    const admissionTypeBreakdown = Array.from(typeMap.entries()).map(([admissionType, count]) => ({
      admissionType,
      count
    }));

    // Calculate bed occupancy across all beds
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({ where: { isOccupied: true } });
    const availableBeds = totalBeds - occupiedBeds;
    const overallOccupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Return the statistics
    res.json({
      totalAdmissions,
      currentAdmissions,
      dischargedAdmissions,
      averageLengthOfStay: Number(averageLengthOfStay.toFixed(1)),
      wardBreakdown,
      admissionTypeBreakdown,
      bedOccupancy: {
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate: overallOccupancyRate
      }
    });
    
  } catch (error) {
    console.error('Error fetching admission stats:', error);
    res.status(500).json({ 
      message: 'Error fetching admission stats', 
      error: (error as Error).message 
    });
  }
};

// ==============================
// GET ADMISSIONS BY PATIENT ID - NEW ENDPOINT
// ==============================
export const getAdmissionsByPatientId = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where: { patientId },
        include: {
          Ward: {
            select: {
              wardName: true,
              wardType: true
            }
          },
          Bed: {
            select: {
              bedNumber: true
            }
          },
          Diagnosis: {
            select: {
              name: true,
              icdCode: true
            }
          }
        },
        orderBy: {
          admissionDate: 'desc'
        },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.admission.count({ where: { patientId } })
    ]);

    res.json({
      admissions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching patient admissions:', error);
    res.status(500).json({ 
      message: 'Error fetching patient admissions', 
      error: (error as Error).message 
    });
  }
};