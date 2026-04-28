// controllers/referralController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ReferralType, ReferralStatus, Priority } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// ==============================================
// GET ALL REFERRALS
// ==============================================
export const getReferrals = async (req: AuthRequest, res: Response) => {
  try {
    const {
      referralType,
      status,
      patientId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    const where: any = {};

    if (referralType) where.referralType = referralType as ReferralType;
    if (status) where.status = status as ReferralStatus;
    if (patientId) where.patientId = patientId as string;

    if (dateFrom || dateTo) {
      where.referralDate = {};
      if (dateFrom) where.referralDate.gte = new Date(dateFrom as string);
      if (dateTo) where.referralDate.lte = new Date(dateTo as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [referrals, total] = await Promise.all([
      prisma.referralRecord.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true,
              dateOfBirth: true,
              gender: true
            }
          },
          attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              dateTime: true,
              attendanceType: true
            }
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true
            }
          }
        },
        orderBy: { referralDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.referralRecord.count({ where })
    ]);

    // Add full name to patient objects
    const referralsWithFullName = referrals.map(ref => ({
      ...ref,
      patient: ref.patient ? {
        ...ref.patient,
        fullName: `${ref.patient.surname} ${ref.patient.otherNames}`.trim()
      } : null
    }));

    res.json({
      success: true,
      data: referralsWithFullName,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching referrals',
      error: (error as Error).message
    });
  }
};

// ==============================================
// GET REFERRAL BY ID
// ==============================================
export const getReferralById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const referral = await prisma.referralRecord.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            address: true,
            dateOfBirth: true,
            gender: true,
            insuranceProvider: {
              select: {
                name: true,
                type: true
              }
            }
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            attendanceType: true,
            encounterCategory: true,
            diagnoses: {
              include: {
                diagnosis: {
                  select: {
                    name: true,
                    icdCode: true
                  }
                }
              },
              take: 1,
              where: { primary: true }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        }
      }
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    const referralWithFullName = {
      ...referral,
      patient: referral.patient ? {
        ...referral.patient,
        fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
      } : null
    };

    res.json({
      success: true,
      data: referralWithFullName
    });
  } catch (error) {
    console.error('Error fetching referral:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching referral',
      error: (error as Error).message
    });
  }
};

// ==============================================
// CREATE OUTGOING REFERRAL
// ==============================================
export const createOutgoingReferral = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('attendanceId').optional().isString(),
  body('referralReason').notEmpty().withMessage('Referral reason is required'),
  body('referredToFacility').notEmpty().withMessage('Referred to facility is required'),
  body('urgency').optional().isIn(['routine', 'urgent', 'stat']).withMessage('Valid urgency required'),
  body('referredToDoctor').optional().isString(),
  body('referredToDepartment').optional().isString(),
  body('referralNotes').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        patientId,
        attendanceId,
        referralReason,
        referredToFacility,
        referredToDoctor,
        referredToDepartment,
        urgency,
        referralNotes
      } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      // Validate patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Validate attendance if provided
      if (attendanceId) {
        const attendance = await prisma.attendance.findUnique({
          where: { id: attendanceId }
        });
        if (!attendance) {
          return res.status(404).json({
            success: false,
            message: 'Attendance not found'
          });
        }
        if (attendance.patientId !== patientId) {
          return res.status(400).json({
            success: false,
            message: 'Attendance does not belong to this patient'
          });
        }
      }

      // Generate referral number
      const referralCount = await prisma.referralRecord.count();
      const referralNumber = `REF-${new Date().getFullYear()}-${String(referralCount + 1).padStart(6, '0')}`;

      const referral = await prisma.referralRecord.create({
        data: {
          referralNumber,
          patientId,
          attendanceId,
          referralType: 'outgoing',
          referralReason,
          referredToFacility,
          referredToDoctor,
          referredToDepartment,
          urgency: (urgency as Priority) || 'routine',
          referralNotes,
          status: 'pending',
          createdById: req.user.id
        },
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true,
              dateOfBirth: true,
              gender: true
            }
          },
          attendance: {
            select: {
              attendanceNumber: true,
              dateTime: true
            }
          },
          createdBy: {
            select: {
              fullName: true,
              role: true
            }
          }
        }
      });

      const referralWithFullName = {
        ...referral,
        patient: referral.patient ? {
          ...referral.patient,
          fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        } : null
      };

      res.status(201).json({
        success: true,
        message: 'Outgoing referral created successfully',
        data: referralWithFullName
      });
    } catch (error) {
      console.error('Error creating outgoing referral:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating outgoing referral',
        error: (error as Error).message
      });
    }
  }
];

// ==============================================
// CREATE INCOMING REFERRAL
// ==============================================
export const createIncomingReferral = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('referralReason').notEmpty().withMessage('Referral reason is required'),
  body('referredFromFacility').notEmpty().withMessage('Referred from facility is required'),
  body('referredFromDoctor').optional().isString(),
  body('urgency').optional().isIn(['routine', 'urgent', 'stat']).withMessage('Valid urgency required'),
  body('referralNotes').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        patientId,
        referralReason,
        referredFromFacility,
        referredFromDoctor,
        urgency,
        referralNotes
      } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      // Validate patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Generate referral number
      const referralCount = await prisma.referralRecord.count();
      const referralNumber = `REF-IN-${new Date().getFullYear()}-${String(referralCount + 1).padStart(6, '0')}`;

      const referral = await prisma.referralRecord.create({
        data: {
          referralNumber,
          patientId,
          referralType: 'incoming',
          referralReason,
          referredFromFacility,
          referredFromDoctor,
          urgency: (urgency as Priority) || 'routine',
          referralNotes,
          status: 'pending',
          createdById: req.user.id
        },
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true
            }
          },
          createdBy: {
            select: {
              fullName: true,
              role: true
            }
          }
        }
      });

      const referralWithFullName = {
        ...referral,
        patient: referral.patient ? {
          ...referral.patient,
          fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        } : null
      };

      res.status(201).json({
        success: true,
        message: 'Incoming referral recorded successfully',
        data: referralWithFullName
      });
    } catch (error) {
      console.error('Error creating incoming referral:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating incoming referral',
        error: (error as Error).message
      });
    }
  }
];

// ==============================================
// UPDATE REFERRAL STATUS
// ==============================================
export const updateReferralStatus = [
  body('status').isIn(['pending', 'accepted', 'completed', 'cancelled']).withMessage('Valid status required'),
  body('outcomeNotes').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { status, outcomeNotes } = req.body;

      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'completed' || status === 'accepted') {
        updateData.completedAt = new Date();
      }

      if (outcomeNotes) {
        updateData.outcomeNotes = outcomeNotes;
      }

      const referral = await prisma.referralRecord.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          createdBy: {
            select: {
              fullName: true,
              role: true
            }
          }
        }
      });

      const referralWithFullName = {
        ...referral,
        patient: referral.patient ? {
          ...referral.patient,
          fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        } : null
      };

      res.json({
        success: true,
        message: `Referral status updated to ${status}`,
        data: referralWithFullName
      });
    } catch (error) {
      console.error('Error updating referral status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating referral status',
        error: (error as Error).message
      });
    }
  }
];

// ==============================================
// UPDATE REFERRAL (Full update)
// ==============================================
export const updateReferral = [
  body('referralReason').optional().isString(),
  body('referralNotes').optional().isString(),
  body('referredToFacility').optional().isString(),
  body('referredToDoctor').optional().isString(),
  body('referredToDepartment').optional().isString(),
  body('referredFromFacility').optional().isString(),
  body('referredFromDoctor').optional().isString(),
  body('urgency').optional().isIn(['routine', 'urgent', 'stat']).withMessage('Valid urgency required'),
  body('outcomeNotes').optional().isString(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = { ...req.body, updatedAt: new Date() };

      const referral = await prisma.referralRecord.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          createdBy: {
            select: {
              fullName: true,
              role: true
            }
          }
        }
      });

      const referralWithFullName = {
        ...referral,
        patient: referral.patient ? {
          ...referral.patient,
          fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        } : null
      };

      res.json({
        success: true,
        message: 'Referral updated successfully',
        data: referralWithFullName
      });
    } catch (error) {
      console.error('Error updating referral:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating referral',
        error: (error as Error).message
      });
    }
  }
];

// ==============================================
// DELETE REFERRAL
// ==============================================
export const deleteReferral = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const referral = await prisma.referralRecord.findUnique({
      where: { id }
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    // Only allow deletion of pending referrals
    if (referral.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending referrals can be deleted'
      });
    }

    await prisma.referralRecord.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Referral deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting referral:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting referral',
      error: (error as Error).message
    });
  }
};

// ==============================================
// GET REFERRALS BY PATIENT
// ==============================================
export const getReferralsByPatient = async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [referrals, total] = await Promise.all([
      prisma.referralRecord.findMany({
        where: { patientId },
        include: {
          attendance: {
            select: {
              attendanceNumber: true,
              dateTime: true
            }
          },
          createdBy: {
            select: {
              fullName: true,
              role: true
            }
          }
        },
        orderBy: { referralDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.referralRecord.count({ where: { patientId } })
    ]);

    res.json({
      success: true,
      data: referrals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching patient referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient referrals',
      error: (error as Error).message
    });
  }
};

// ==============================================
// GENERATE REFERRAL LETTER (PDF content)
// ==============================================
export const generateReferralLetter = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const referral = await prisma.referralRecord.findUnique({
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
            contact: true,
            address: true
          }
        },
        attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            dateTime: true,
            attendanceType: true,
            complaints: true,
            medicalNotes: true,
            diagnoses: {
              include: {
                diagnosis: {
                  select: {
                    name: true,
                    icdCode: true
                  }
                }
              },
              where: { primary: true }
            }
          }
        },
        createdBy: {
          select: {
            fullName: true,
            role: true
          }
        }
      }
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    // Get hospital info
    const hospital = await prisma.hospital.findFirst();

    // Get primary diagnosis
    const primaryDiagnosis = referral.attendance?.diagnoses?.find(d => d.primary)?.diagnosis;

    // Generate letter content
    const letterData = {
      referralNumber: referral.referralNumber,
      referralDate: referral.referralDate,
      hospitalName: hospital?.name || 'Hospital Name',
      hospitalAddress: hospital?.address || 'Hospital Address',
      hospitalPhone: hospital?.phone || 'Phone Number',
      
      patientFullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim(),
      patientFolderNumber: referral.patient.folderNumber,
      patientDateOfBirth: referral.patient.dateOfBirth,
      patientGender: referral.patient.gender,
      patientContact: referral.patient.contact,
      patientAddress: referral.patient.address,
      
      referringDoctor: referral.createdBy?.fullName || 'Unknown',
      referredToFacility: referral.referredToFacility,
      referredToDoctor: referral.referredToDoctor || 'Medical Officer',
      referredToDepartment: referral.referredToDepartment || 'General Outpatient',
      
      urgency: referral.urgency,
      referralReason: referral.referralReason,
      referralNotes: referral.referralNotes,
      
      primaryDiagnosis: primaryDiagnosis?.name || 'Not specified',
      icdCode: primaryDiagnosis?.icdCode || 'N/A',
      complaints: referral.attendance?.complaints || 'No complaints recorded',
      clinicalNotes: referral.attendance?.medicalNotes || 'No additional notes',
      
      attendanceNumber: referral.attendance?.attendanceNumber,
      attendanceDate: referral.attendance?.dateTime
    };

    res.json({
      success: true,
      data: {
        letterData,
        letterHtml: generateReferralLetterHtml(letterData)
      }
    });
  } catch (error) {
    console.error('Error generating referral letter:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating referral letter',
      error: (error as Error).message
    });
  }
};

// Helper function to generate HTML for referral letter
function generateReferralLetterHtml(data: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Referral Letter - ${data.referralNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .hospital-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .hospital-address { font-size: 12px; color: #666; }
    .referral-number { font-size: 14px; font-weight: bold; margin-top: 10px; }
    .to-section { margin-bottom: 30px; }
    .patient-info { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .info-row { margin: 5px 0; }
    .label { font-weight: bold; display: inline-block; width: 150px; }
    .urgency { color: #c00; font-weight: bold; }
    .clinical-section { margin: 20px 0; }
    .signature { margin-top: 50px; }
    .signature-line { margin-top: 30px; border-top: 1px solid #333; width: 300px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="hospital-name">${data.hospitalName}</div>
    <div class="hospital-address">${data.hospitalAddress} | Tel: ${data.hospitalPhone}</div>
    <div class="referral-number">REFERRAL LETTER: ${data.referralNumber}</div>
    <div>Date: ${new Date(data.referralDate).toLocaleDateString()}</div>
  </div>

  <div class="to-section">
    <strong>TO:</strong><br>
    The Medical Officer-in-Charge<br>
    ${data.referredToFacility}<br>
    Attn: ${data.referredToDoctor} (${data.referredToDepartment})<br>
    <span class="urgency">URGENCY: ${data.urgency.toUpperCase()}</span>
  </div>

  <div class="patient-info">
    <div class="info-row"><span class="label">Patient Name:</span> ${data.patientFullName}</div>
    <div class="info-row"><span class="label">Folder Number:</span> ${data.patientFolderNumber}</div>
    <div class="info-row"><span class="label">Date of Birth:</span> ${new Date(data.patientDateOfBirth).toLocaleDateString()}</div>
    <div class="info-row"><span class="label">Gender:</span> ${data.patientGender}</div>
    <div class="info-row"><span class="label">Contact:</span> ${data.patientContact || 'N/A'}</div>
    <div class="info-row"><span class="label">Address:</span> ${data.patientAddress || 'N/A'}</div>
  </div>

  <div class="clinical-section">
    <strong>REASON FOR REFERRAL:</strong>
    <p>${data.referralReason}</p>

    <strong>PRIMARY DIAGNOSIS:</strong>
    <p>${data.primaryDiagnosis} (ICD-10: ${data.icdCode})</p>

    <strong>PATIENT COMPLAINTS:</strong>
    <p>${data.complaints}</p>

    <strong>CLINICAL NOTES:</strong>
    <p>${data.clinicalNotes || 'No additional notes'}</p>

    <strong>ADDITIONAL INFORMATION:</strong>
    <p>${data.referralNotes || 'N/A'}</p>
  </div>

  <div class="signature">
    <p>Referring Clinician: <strong>${data.referringDoctor}</strong></p>
    <div class="signature-line"></div>
    <p>Signature & Stamp</p>
  </div>

  <div style="margin-top: 30px; font-size: 10px; color: #999; text-align: center;">
    This is a computer-generated referral letter. Please direct all communication to the referring clinician.
  </div>
</body>
</html>`;
}

// ==============================================
// GET REFERRAL STATISTICS
// ==============================================
export const getReferralStats = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.referralDate = {};
      if (startDate) where.referralDate.gte = new Date(startDate as string);
      if (endDate) where.referralDate.lte = new Date(endDate as string);
    }

    const [totalReferrals, byType, byStatus, byUrgency] = await Promise.all([
      prisma.referralRecord.count({ where }),
      prisma.referralRecord.groupBy({
        by: ['referralType'],
        where,
        _count: true
      }),
      prisma.referralRecord.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.referralRecord.groupBy({
        by: ['urgency'],
        where,
        _count: true
      })
    ]);

    res.json({
      success: true,
      data: {
        totalReferrals,
        byType,
        byStatus,
        byUrgency
      }
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching referral statistics',
      error: (error as Error).message
    });
  }
};