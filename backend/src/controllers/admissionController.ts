// controllers/admissionController.ts - SIMPLIFIED VERSION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, AdmissionType } from '@prisma/client';
const prisma = new PrismaClient();
import { NotificationService } from '../services/NotificationService';

// ==============================
// GET ALL ADMISSIONS
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
            }
          },
          Bed: {
            select: {
              bedNumber: true
            }
          },
          Attendance: {
            include: {
              AttendanceDiagnosis: {
                where: { diagnosisType: 'primary' },
                include: { Diagnosis: true },
                take: 1
              }
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

    // Transform to include primary diagnosis and full name
    const admissionsWithFullName = admissions.map(admission => ({
      ...admission,
      patient: admission.Patient ? {
        ...admission.Patient,
        fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim()
      } : null,
      primaryDiagnosis: admission.Attendance?.AttendanceDiagnosis[0]?.Diagnosis || null
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
// CREATE NEW ADMISSION
// ==============================
export const createAdmission = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('wardId').notEmpty().withMessage('Ward ID is required'),
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('admittingDoctor').notEmpty().withMessage('Admitting doctor is required'),
  body('reasonForAdmission').notEmpty().withMessage('Reason for admission is required'),
  body('primaryDiagnosisId').notEmpty().withMessage('Primary diagnosis ID is required'),

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
        primaryDiagnosisId,
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

        // Handle attendance: either use existing or create new
        let finalAttendanceId = attendanceId;
        
        if (!finalAttendanceId) {
          // Create a new attendance record for this admission
          const attendance = await tx.attendance.create({
            data: {
              attendanceNumber: `ATT-${Date.now()}`,
              patientId,
              attendanceType: 'general_consultation',
              dateTime: new Date(),
              paymentMode: admissionData.paymentMode || 'nhis',
              status: 'admitted',
              encounterCategory: 'ipd',
              visitCategory: 'inpatient',
              serviceCategory: 'ipd',
              complaints: admissionData.reasonForAdmission,
              createdById: user.id
            }
          });
          finalAttendanceId = attendance.id;
        } else {
          // Validate existing attendance
          const attendance = await tx.attendance.findUnique({
            where: { id: finalAttendanceId }
          });
          
          if (!attendance) throw new Error('Attendance record not found');
          if (attendance.patientId !== patientId) throw new Error('Attendance does not belong to patient');
          
          // Update attendance status to 'admitted'
          await tx.attendance.update({
            where: { id: finalAttendanceId },
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

        // Get primary diagnosis info
        const primaryDiagnosis = await tx.diagnosis.findUnique({
          where: { id: primaryDiagnosisId }
        });

        if (!primaryDiagnosis) {
          throw new Error('Primary diagnosis not found');
        }

        // Create primary diagnosis record in AttendanceDiagnosis
        await tx.attendanceDiagnosis.create({
          data: {
            attendanceId: finalAttendanceId,
            diagnosisId: primaryDiagnosisId,
            diagnosisType: 'primary',
            icdCode: primaryDiagnosis.icdCode,
            createdById: user.id,
            presentOnAdmission: admissionData.presentOnAdmission || 'Y'
          }
        });

        // Create admission
        const admission = await tx.admission.create({
          data: {
            admissionNumber,
            patientId,
            wardId,
            bedId,
            attendanceId: finalAttendanceId,
            admittingDoctor: admissionData.admittingDoctor,
            reasonForAdmission: admissionData.reasonForAdmission,
            diagnosis: primaryDiagnosis.name,
            admissionDate: admissionData.admissionDate ? new Date(admissionData.admissionDate) : new Date(),
            admissionTime: admissionData.admissionTime || new Date().toTimeString().slice(0, 5),
            status: 'admitted',
            admissionType: admissionData.admissionType || 'emergency',
            admissionSource: admissionData.admissionSource || 'home',
            createdBy: user.id,
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
            Attendance: {
              include: {
                AttendanceDiagnosis: {
                  where: { diagnosisType: 'primary' },
                  include: { Diagnosis: true }
                }
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

      // Transform response
      const resultWithFullName = {
        ...result,
        patient: result.Patient ? {
          ...result.Patient,
          fullName: `${result.Patient.surname} ${result.Patient.otherNames}`.trim()
        } : null,
        primaryDiagnosis: result.Attendance?.AttendanceDiagnosis[0]?.Diagnosis || null
      };

      // Send notifications
      await NotificationService.sendAdmissionNotifications(result.id);

      res.status(201).json({
        message: 'Admission created successfully',
        admission: resultWithFullName,
        relationship: attendanceId ? 'Extended from attendance' : 'New attendance created'
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
// GET ADMISSION BY ID
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
        Attendance: {
          include: {
            AttendanceDiagnosis: {
              include: {
                Diagnosis: true
              },
              orderBy: {
                diagnosisType: 'asc'  // primary first, then additional, then provisional
              }
            },
            Vitals: {
              orderBy: { recordedAt: 'desc' },
              take: 5
            }
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

    // Separate diagnoses by type
    const attendanceDiagnoses = admission.Attendance?.AttendanceDiagnosis || [];
    const primaryDiagnosis = attendanceDiagnoses.find(d => d.diagnosisType === 'primary');
    const additionalDiagnoses = attendanceDiagnoses.filter(d => d.diagnosisType === 'additional');
    const provisionalDiagnoses = attendanceDiagnoses.filter(d => d.diagnosisType === 'provisional');

    // Transform response
    const admissionWithFullName = {
      ...admission,
      patient: admission.Patient ? {
        ...admission.Patient,
        fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim()
      } : null,
      primaryDiagnosis,
      additionalDiagnoses,
      provisionalDiagnoses,
      Attendance: admission.Attendance ? {
        ...admission.Attendance,
        AttendanceDiagnosis: undefined, // Remove raw array
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
// ADD SECONDARY DIAGNOSIS TO ADMISSION
// ==============================
export const addSecondaryDiagnosis = [
  body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
  body('diagnosisType').isIn(['additional', 'provisional']).withMessage('Diagnosis type must be additional or provisional'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { diagnosisId, diagnosisType, notes, presentOnAdmission } = req.body;
      const user = (req as any).user;

      const admission = await prisma.admission.findUnique({
        where: { id: req.params.id },
        include: { Attendance: true }
      });

      if (!admission) {
        return res.status(404).json({ message: 'Admission not found' });
      }

      if (!admission.Attendance) {
        return res.status(400).json({ message: 'Admission has no associated attendance' });
      }

      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId }
      });

      if (!diagnosis) {
        return res.status(404).json({ message: 'Diagnosis not found' });
      }

      // Check if diagnosis already exists for this attendance
      const existing = await prisma.attendanceDiagnosis.findFirst({
        where: {
          attendanceId: admission.Attendance.id,
          diagnosisId: diagnosisId
        }
      });

      if (existing) {
        return res.status(400).json({ message: 'Diagnosis already added to this admission' });
      }

      const attendanceDiagnosis = await prisma.attendanceDiagnosis.create({
        data: {
          attendanceId: admission.Attendance.id,
          diagnosisId,
          diagnosisType: diagnosisType as any,
          notes,
          icdCode: diagnosis.icdCode,
          presentOnAdmission: presentOnAdmission || 'Y',
          createdById: user?.id
        },
        include: {
          Diagnosis: true
        }
      });

      res.status(201).json({
        message: 'Secondary diagnosis added successfully',
        diagnosis: attendanceDiagnosis
      });

    } catch (error) {
      console.error('Error adding secondary diagnosis:', error);
      res.status(500).json({ 
        message: 'Error adding secondary diagnosis', 
        error: (error as Error).message 
      });
    }
  }
];

// ==============================
// REMOVE DIAGNOSIS FROM ADMISSION
// ==============================
export const removeDiagnosis = async (req: Request, res: Response) => {
  try {
    const { attendanceDiagnosisId } = req.params;

    const attendanceDiagnosis = await prisma.attendanceDiagnosis.findUnique({
      where: { id: attendanceDiagnosisId },
      include: {
        Attendance: {
          include: {
            Admission: true
          }
        }
      }
    });

    if (!attendanceDiagnosis) {
      return res.status(404).json({ message: 'Diagnosis not found' });
    }

    // Don't allow removing primary diagnosis
    if (attendanceDiagnosis.diagnosisType === 'primary') {
      return res.status(400).json({ message: 'Cannot remove primary diagnosis. Update it instead.' });
    }

    await prisma.attendanceDiagnosis.delete({
      where: { id: attendanceDiagnosisId }
    });

    res.json({ message: 'Diagnosis removed successfully' });

  } catch (error) {
    console.error('Error removing diagnosis:', error);
    res.status(500).json({ 
      message: 'Error removing diagnosis', 
      error: (error as Error).message 
    });
  }
};

// ==============================
// UPDATE PRIMARY DIAGNOSIS
// ==============================
export const updatePrimaryDiagnosis = [
  body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { diagnosisId, notes, presentOnAdmission } = req.body;
      const user = (req as any).user;

      const admission = await prisma.admission.findUnique({
        where: { id: req.params.id },
        include: { Attendance: true }
      });

      if (!admission) {
        return res.status(404).json({ message: 'Admission not found' });
      }

      if (!admission.Attendance) {
        return res.status(400).json({ message: 'Admission has no associated attendance' });
      }

      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId }
      });

      if (!diagnosis) {
        return res.status(404).json({ message: 'Diagnosis not found' });
      }

      // Find existing primary diagnosis
      const existingPrimary = await prisma.attendanceDiagnosis.findFirst({
        where: {
          attendanceId: admission.Attendance.id,
          diagnosisType: 'primary'
        }
      });

      let result;
      if (existingPrimary) {
        // Update existing primary diagnosis
        result = await prisma.attendanceDiagnosis.update({
          where: { id: existingPrimary.id },
          data: {
            diagnosisId,
            icdCode: diagnosis.icdCode,
            notes: notes || existingPrimary.notes,
            presentOnAdmission: presentOnAdmission || existingPrimary.presentOnAdmission,
            updatedAt: new Date()
          },
          include: { Diagnosis: true }
        });
      } else {
        // Create new primary diagnosis
        result = await prisma.attendanceDiagnosis.create({
          data: {
            attendanceId: admission.Attendance.id,
            diagnosisId,
            diagnosisType: 'primary',
            icdCode: diagnosis.icdCode,
            notes,
            presentOnAdmission: presentOnAdmission || 'Y',
            createdById: user?.id
          },
          include: { Diagnosis: true }
        });
      }

      // Update admission diagnosis field
      await prisma.admission.update({
        where: { id: admission.id },
        data: { diagnosis: diagnosis.name }
      });

      res.json({
        message: 'Primary diagnosis updated successfully',
        primaryDiagnosis: result
      });

    } catch (error) {
      console.error('Error updating primary diagnosis:', error);
      res.status(500).json({ 
        message: 'Error updating primary diagnosis', 
        error: (error as Error).message 
      });
    }
  }
];

// ==============================
// DISCHARGE PATIENT
// ==============================
export const dischargePatient = [
  body('dischargeDate').isISO8601().withMessage('Valid discharge date required'),
  body('dischargeStatus').isIn(['home', 'transfer', 'expired', 'against_medical_advice']).withMessage('Valid discharge status required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
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
            Bed: true,
            Attendance: {
              include: {
                LabTest: {
                  where: { status: { not: 'completed' } }
                },
                Procedure: {
                  where: { status: { not: 'completed' } }
                }
              }
            }
          }
        });

        if (!admission) {
          throw new Error('Admission not found');
        }

        // Check for pending tasks
        const pendingLabTests = admission.Attendance?.LabTest || [];
        const pendingProcedures = admission.Attendance?.Procedure || [];
        
        if (pendingLabTests.length > 0 || pendingProcedures.length > 0) {
          throw new Error(`Cannot discharge: ${pendingLabTests.length} pending lab tests, ${pendingProcedures.length} pending procedures`);
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
            Attendance: {
              include: {
                AttendanceDiagnosis: {
                  include: { Diagnosis: true }
                }
              }
            }
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
            occupiedBeds: { decrement: 1 }
          }
        });

        // Update attendance status
        if (admission.attendanceId) {
          await tx.attendance.update({
            where: { id: admission.attendanceId },
            data: { status: 'discharged' }
          });
        }

        return updatedAdmission;
      });

      // Transform response
      const resultWithFullName = {
        ...result,
        patient: result.Patient ? {
          ...result.Patient,
          fullName: `${result.Patient.surname} ${result.Patient.otherNames}`.trim()
        } : null
      };

      // Send discharge notifications
      await NotificationService.sendDischargeNotifications(req.params.id);

      res.json({
        message: 'Patient discharged successfully',
        admission: resultWithFullName,
        lengthOfStay: result.lengthOfStay
      });

    } catch (error) {
      console.error('Error discharging patient:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('pending')) {
        return res.status(400).json({ message: errorMessage });
      }
      if ((error as any).code === 'P2025') {
        return res.status(404).json({ message: 'Admission not found' });
      }
      res.status(500).json({ 
        message: 'Error discharging patient', 
        error: errorMessage 
      });
    }
  }
];

// ==============================
// ADD DAILY NOTES
// ==============================
export const addDailyNotes = async (req: Request, res: Response) => {
  try {
    const admissionId = req.params.admissionId || req.params.id;
    
    if (!admissionId) {
      return res.status(400).json({ message: 'Admission ID is required' });
    }

    const { notes } = req.body;
    const user = (req as any).user;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ message: 'Notes are required' });
    }

    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      select: { dailyNotes: true }
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    const existingNotes = (admission.dailyNotes as any) || {};
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const timeKey = now.toTimeString().slice(0, 5);
    
    if (existingNotes[dateKey]) {
      existingNotes[dateKey] = {
        notes: existingNotes[dateKey].notes + '\n\n[' + timeKey + '] ' + notes,
        recordedBy: {
          id: user?.id,
          fullName: user?.fullName || user?.username,
          role: user?.role
        },
        recordedAt: now.toISOString()
      };
    } else {
      existingNotes[dateKey] = {
        notes: `[${timeKey}] ${notes}`,
        recordedBy: {
          id: user?.id,
          fullName: user?.fullName || user?.username,
          role: user?.role
        },
        recordedAt: now.toISOString()
      };
    }

    const updatedAdmission = await prisma.admission.update({
      where: { id: admissionId },
      data: { 
        dailyNotes: existingNotes,
        updatedAt: new Date()
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

    res.json({
      success: true,
      message: 'Daily note added successfully',
      admission: {
        ...updatedAdmission,
        patient: updatedAdmission.Patient ? {
          ...updatedAdmission.Patient,
          fullName: `${updatedAdmission.Patient.surname} ${updatedAdmission.Patient.otherNames}`.trim()
        } : null
      }
    });
    
  } catch (error) {
    console.error('Error adding daily note:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding daily note', 
      error: (error as Error).message 
    });
  }
};

// ==============================
// GET ADMISSION STATISTICS
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

    const admissions = await prisma.admission.findMany({
      where,
      select: {
        id: true,
        status: true,
        lengthOfStay: true,
        admissionType: true,
        admissionDate: true,
        dischargeDate: true
      }
    });

    const totalAdmissions = admissions.length;
    const currentAdmissions = admissions.filter(a => a.status === 'admitted').length;
    const dischargedAdmissions = admissions.filter(a => a.status === 'discharged').length;

    const dischargedWithLOS = admissions.filter(a => 
      a.status === 'discharged' && 
      a.lengthOfStay !== null && 
      a.lengthOfStay > 0
    );
    
    const averageLengthOfStay = dischargedWithLOS.length > 0
      ? dischargedWithLOS.reduce((sum, a) => sum + (a.lengthOfStay || 0), 0) / dischargedWithLOS.length
      : 0;

    // Bed occupancy
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({ where: { isOccupied: true } });
    const availableBeds = totalBeds - occupiedBeds;
    const overallOccupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Admission type breakdown
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

    res.json({
      success: true,
      data: {
        totalAdmissions,
        currentAdmissions,
        dischargedAdmissions,
        averageLengthOfStay: Number(averageLengthOfStay.toFixed(1)),
        admissionTypeBreakdown,
        bedOccupancy: {
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate: overallOccupancyRate
        }
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
// GET ADMISSIONS BY PATIENT ID
// ==============================
export const getAdmissionsByPatientId = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

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
          Attendance: {
            include: {
              AttendanceDiagnosis: {
                where: { diagnosisType: 'primary' },
                include: { Diagnosis: true }
              }
            }
          }
        },
        orderBy: {
          admissionDate: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.admission.count({ where: { patientId } })
    ]);

    const transformedAdmissions = admissions.map(admission => ({
      ...admission,
      primaryDiagnosis: admission.Attendance?.AttendanceDiagnosis[0]?.Diagnosis || null
    }));

    res.json({
      success: true,
      data: transformedAdmissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
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

// ==============================
// DELETE ADMISSION
// ==============================
export const deleteAdmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admission = await prisma.admission.findUnique({
      where: { id },
      include: {
        Bed: true,
        Ward: true,
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        Attendance: {
          include: {
            AttendanceDiagnosis: {
              where: { diagnosisType: 'primary' }
            }
          }
        }
      }
    });

    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    // Check if admission can be deleted (only pending or cancelled, not active admitted/discharged)
    if (admission.status === 'admitted') {
      return res.status(400).json({ 
        message: 'Cannot delete active admission. Please discharge the patient first.' 
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Free up the bed if admission was occupying one
      if (admission.bedId) {
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
      }

      // Update attendance status back to pending if it exists
      if (admission.attendanceId) {
        await tx.attendance.update({
          where: { id: admission.attendanceId },
          data: { status: 'pending' }
        });
      }

      // Delete any ward charge records associated with this admission
      await tx.wardChargeRecord.deleteMany({
        where: { admissionId: admission.id }
      });

      // Delete any daily notes (stored as JSON in the admission record - just set to null)
      // No separate table for daily notes

      // Delete the admission
      await tx.admission.delete({
        where: { id: admission.id }
      });

      return admission;
    });

    const patientFullName = admission.Patient ? 
      `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim() : 
      'Unknown Patient';

    res.json({ 
      success: true,
      message: 'Admission deleted successfully',
      data: {
        id: result.id,
        admissionNumber: result.admissionNumber,
        patientName: patientFullName,
        status: result.status,
        bedFreed: result.bedId || null
      }
    });
  } catch (error) {
    console.error('Error deleting admission:', error);
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ message: 'Admission not found' });
    }
    if ((error as any).code === 'P2003') {
      return res.status(400).json({ 
        message: 'Cannot delete admission with related records. Please remove associated records first.' 
      });
    }
    res.status(500).json({ 
      message: 'Error deleting admission', 
      error: (error as Error).message 
    });
  }
};

// ==============================
// UPDATE ADMISSION
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

