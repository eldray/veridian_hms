import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient, PaymentMode, Gender } from '@prisma/client';

const prisma = new PrismaClient();
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Helper function to calculate age with months
function calculateAgeWithMonths(dateOfBirth: string | Date): { years: number, months: number, display: string } {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  
  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  if (today.getDate() < birthDate.getDate()) months--;

  let display = '';
  if (years === 0 && months === 0) display = 'Newborn';
  else if (years === 0) display = `${months} month${months !== 1 ? 's' : ''}`;
  else if (months === 0) display = `${years} year${years !== 1 ? 's' : ''}`;
  else display = `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;

  return { years, months, display };
}

// Helper function to normalize date for backend
function normalizeDateForBackend(dateString: string): Date {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  } catch (error) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
}

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📋 Fetching patients...', {
      user: req.user?.username,
      role: req.user?.role
    });

    const {
      page = 1,
      limit = 50,
      search = '',
      paymentMode,
      gender,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where: any = {};

    if (search) {
      where.OR = [
        { surname: { contains: search as string, mode: 'insensitive' } },
        { otherNames: { contains: search as string, mode: 'insensitive' } },
        { folderNumber: { contains: search as string, mode: 'insensitive' } },
        { contact: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (paymentMode) {
      where.paymentMode = paymentMode as PaymentMode;
    }

    if (gender) {
      where.gender = gender as Gender;
    }

    const patients = await prisma.patient.findMany({
      where,
      include: {
        InsuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        Admission: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            admissionNumber: true,
            status: true,
            admissionDate: true
          }
        },
        Attendance: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            attendanceNumber: true,
            status: true,
            dateTime: true
          }
        }
      },
      orderBy: {
        [sortBy as string]: sortOrder
      },
      skip,
      take: limitNum
    });

    // Add fullName field by combining surname + otherNames
    const patientsWithFullName = patients.map(patient => ({
      ...patient,
      fullName: `${patient.surname} ${patient.otherNames}`.trim()
    }));

    const total = await prisma.patient.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    console.log(`✅ Found ${patients.length} patients`);

    res.json({
      success: true,
      data: patientsWithFullName,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalPatients: total,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const getPatientById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('📋 Fetching patient by ID:', id);

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        InsuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true,
            isActive: true
          }
        },
        Admission: {
          include: {
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
            // ✅ CORRECT: Use the relation name from your schema
            Diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true
              }
            },
            // If you need secondary diagnoses too:
            AdmissionSecondaryDiagnosis: {
              include: {
                Diagnosis: {
                  select: {
                    id: true,
                    name: true,
                    icdCode: true
                  }
                }
              }
            }
          }
        },
        Attendance: {
          include: {
            // ✅ CORRECT: Use the relation names from your schema
            AttendanceDiagnosis: {
              include: {
                Diagnosis: {
                  select: {
                    id: true,
                    name: true,
                    icdCode: true
                  }
                }
              }
            },
            Vitals: {
              orderBy: { recordedAt: 'desc' },
              take: 10
            },
            LabTest: {
              include: {
                LabTestTemplate: {
                  select: {
                    id: true,
                    name: true,
                    investigationCode: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        Vitals: {
          orderBy: { recordedAt: 'desc' },
          take: 20
        },
        Bill: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            paidAmount: true,
            balance: true,
            status: true,
            billDate: true
          }
        },
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          take: 10,
          include: {
            doctor: {
              select: {
                id: true,
                fullName: true,
                username: true
              }
            },
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!patient) {
      console.log('❌ Patient not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Add fullName by combining surname + otherNames
    const patientWithFullName = {
      ...patient,
      fullName: `${patient.surname} ${patient.otherNames}`.trim()
    };

    console.log('✅ Patient fetched successfully:', patient.folderNumber);

    res.json({
      success: true,
      data: patientWithFullName
    });
  } catch (error) {
    console.error('❌ Error fetching patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const createPatient = [
  // Validation rules
  body('surname').notEmpty().withMessage('Surname is required').trim().escape(),
  body('otherNames').notEmpty().withMessage('Other names are required').trim().escape(),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('dateOfBirth')
    .custom((value) => {
      try {
        const date = new Date(value);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    })
    .withMessage('Valid date of birth is required'),
  body('contact').notEmpty().withMessage('Contact number is required').trim(),
  body('address').notEmpty().withMessage('Address is required').trim().escape(),
  body('paymentMode').optional().isIn(['cash', 'nhis', 'private_insurance']).withMessage('Valid payment mode is required'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      console.log('👤 Creating new patient...', {
        user: req.user?.username,
        data: {
          surname: req.body.surname,
          otherNames: req.body.otherNames,
          gender: req.body.gender,
          paymentMode: req.body.paymentMode
        }
      });

      // Parse and normalize dateOfBirth
      const dateOfBirth = normalizeDateForBackend(req.body.dateOfBirth);

      // Parse additional info if provided
      let additionalInfo = {};
      if (req.body.additionalInfo) {
        additionalInfo = typeof req.body.additionalInfo === 'string'
          ? JSON.parse(req.body.additionalInfo)
          : req.body.additionalInfo;
      }

      // Handle insurance provider ID directly
      const insuranceProviderId = req.body.insuranceProviderId || null;
      let insuranceDetails = req.body.insuranceDetails || {};

      // Validate insurance requirements for insurance payment modes
      if (req.body.paymentMode && req.body.paymentMode !== 'cash') {
        if (!insuranceProviderId) {
          return res.status(400).json({
            success: false,
            message: 'Insurance provider is required for insurance payment modes'
          });
        }

        // Validate insurance provider exists
        const provider = await prisma.InsuranceProvider.findUnique({
          where: { id: insuranceProviderId }
        });

        if (!provider) {
          return res.status(400).json({
            success: false,
            message: 'Insurance provider not found'
          });
        }

        // Set basic insurance details if not provided
        if (Object.keys(insuranceDetails).length === 0) {
          insuranceDetails = {
            providerId: insuranceProviderId,
            providerName: provider.name,
            enrolledAt: new Date().toISOString()
          };
        }
      }

      // Generate folder number
      const lastPatient = await prisma.patient.findFirst({
        orderBy: { folderNumber: 'desc' }
      });

      let nextNumber = 10000;
      if (lastPatient && lastPatient.folderNumber) {
        const lastNumber = parseInt(lastPatient.folderNumber.replace('PAT-', ''));
        nextNumber = lastNumber + 1;
      }

      const folderNumber = `PAT-${nextNumber}`;

      // Calculate age with months
      const ageData = calculateAgeWithMonths(dateOfBirth);

      // Prepare patient data
      const patientData = {
        folderNumber,
        surname: req.body.surname,
        otherNames: req.body.otherNames,
        gender: req.body.gender as Gender,
        dateOfBirth: dateOfBirth,
        age: ageData.years,
        ageInMonths: ageData.months,
        contact: req.body.contact,
        address: req.body.address,
        paymentMode: req.body.paymentMode as PaymentMode,
        insuranceDetails: insuranceDetails,
        additionalInfo: additionalInfo,
        billingAddress: req.body.billingAddress || {},
        employer: req.body.employer || {},
        imageUrl: req.body.imageUrl,
        insuranceProviderId,
        registeredBy: req.user?.id || 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create patient with transaction for data consistency
      const patient = await prisma.$transaction(async (tx) => {
        const newPatient = await tx.patient.create({
          data: patientData,
          include: {
            InsuranceProvider: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        });

        console.log('✅ Patient created successfully:', newPatient.folderNumber);
        return newPatient;
      });

      // Add fullName by combining surname + otherNames
      const patientWithFullName = {
        ...patient,
        fullName: `${patient.surname} ${patient.otherNames}`.trim()
      };

      res.status(201).json({
        success: true,
        data: patientWithFullName,
        message: 'Patient created successfully'
      });

    } catch (error) {
      console.error('❌ Error creating patient:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating patient',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

export const updatePatient = [
  // Validation rules for update
  body('surname').optional().notEmpty().withMessage('Surname cannot be empty').trim().escape(),
  body('otherNames').optional().notEmpty().withMessage('Other names cannot be empty').trim().escape(),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('dateOfBirth')
    .optional()
    .custom((value) => {
      try {
        const date = new Date(value);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    })
    .withMessage('Valid date of birth is required'),
  body('contact').optional().notEmpty().withMessage('Contact number cannot be empty').trim(),
  body('address').optional().notEmpty().withMessage('Address cannot be empty').trim().escape(),
  body('paymentMode').optional().isIn(['cash', 'nhis', 'private_insurance']).withMessage('Valid payment mode is required'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Update validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { id } = req.params;
      console.log('📝 Updating patient:', id);

      // Check if patient exists
      const existingPatient = await prisma.patient.findUnique({
        where: { id }
      });

      if (!existingPatient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Prepare update data
      const updateData: any = { ...req.body };

      // Remove ageDisplay since it's not in Prisma model
      if (updateData.ageDisplay !== undefined) {
        delete updateData.ageDisplay;
      }

      // Prevent folder number updates
      if (updateData.folderNumber) {
        delete updateData.folderNumber;
      }

      // Handle date conversion and age calculation
      if (req.body.dateOfBirth) {
        updateData.dateOfBirth = normalizeDateForBackend(req.body.dateOfBirth);
        const ageData = calculateAgeWithMonths(req.body.dateOfBirth);
        updateData.age = ageData.years;
        updateData.ageInMonths = ageData.months;
      }

      // Handle ageInMonths when provided separately
      if (req.body.ageInMonths !== undefined) {
        updateData.ageInMonths = req.body.ageInMonths;
      }

      // Handle insurance provider ID
      if (req.body.insuranceProviderId !== undefined) {
        updateData.insuranceProviderId = req.body.insuranceProviderId;
      }

      // Add updatedAt timestamp
      updateData.updatedAt = new Date();

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const patient = await prisma.patient.update({
        where: { id },
        data: updateData,
        include: {
          InsuranceProvider: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      });

      // Add fullName by combining surname + otherNames
      const patientWithFullName = {
        ...patient,
        fullName: `${patient.surname} ${patient.otherNames}`.trim()
      };

      console.log('✅ Patient updated successfully:', patient.folderNumber);

      res.json({
        success: true,
        data: patientWithFullName,
        message: 'Patient updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating patient:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating patient',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];
export const deletePatient = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting patient:', id);

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
      include: {
        admissions: { take: 1 },
        attendances: { take: 1 },
        bills: { take: 1 },
        appointments: { take: 1 }
      }
    });

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if patient has related records
    if (existingPatient.admissions.length > 0 ||
        existingPatient.attendances.length > 0 ||
        existingPatient.bills.length > 0 ||
        existingPatient.appointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete patient with existing admissions, attendances, bills, or appointments. Consider archiving instead.'
      });
    }

    // Delete patient image if exists
    if (existingPatient.imageUrl && existingPatient.imageUrl.startsWith('/uploads/patients/')) {
      const filename = path.basename(existingPatient.imageUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'patients', filename);

      try {
        await unlinkAsync(filePath);
        console.log('✅ Deleted patient image:', filename);
      } catch (error) {
        console.warn('⚠️ Could not delete patient image:', error);
      }
    }

    await prisma.patient.delete({
      where: { id }
    });

    console.log('✅ Patient deleted successfully:', existingPatient.folderNumber);

    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting patient',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const uploadPatientImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const patientId = req.params.id;
    console.log('📸 Uploading patient image:', patientId);

    // Find the patient first
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      // Delete the uploaded file if patient not found
      await unlinkAsync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Generate the image URL (relative path)
    const imageUrl = `/uploads/patients/${req.file.filename}`;

    // Update patient with new image URL
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: { 
        imageUrl,
        updatedAt: new Date()
      },
      include: {
        InsuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    // If patient had a previous image, delete it
    if (patient.imageUrl && patient.imageUrl.startsWith('/uploads/patients/')) {
      const oldFilename = path.basename(patient.imageUrl);
      const oldPath = path.join(process.cwd(), 'uploads', 'patients', oldFilename);

      try {
        await unlinkAsync(oldPath);
        console.log('✅ Deleted old patient image:', oldFilename);
      } catch (error) {
        console.warn('⚠️ Could not delete old image:', error);
      }
    }

    // Add fullName for backward compatibility
    const patientWithFullName = {
      ...updatedPatient,
      fullName: `${updatedPatient.surname} ${updatedPatient.otherNames}`.trim()
    };

    console.log('✅ Patient image uploaded successfully:', patientId);

    res.json({
      success: true,
      data: {
        imageUrl,
        patient: patientWithFullName
      },
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Error uploading patient image:', error);

    // Delete the uploaded file if there was an error
    if (req.file) {
      try {
        await unlinkAsync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const uploadPatientImageBase64 = async (req: AuthRequest, res: Response) => {
  try {
    const { image } = req.body;
    const patientId = req.params.id;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided'
      });
    }

    console.log('📸 Uploading patient image (base64):', patientId);

    // Find the patient first
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Extract base64 data and extension
    const matches = image.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid base64 image data'
      });
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file size (5MB max)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image too large. Maximum size is 5MB.'
      });
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `patient-${patientId}-${timestamp}.${extension}`;
    const filePath = path.join(process.cwd(), 'uploads', 'patients', filename);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'patients');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file
    await writeFileAsync(filePath, buffer);

    // Generate the image URL
    const imageUrl = `/uploads/patients/${filename}`;

    // Update patient with new image URL
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: { 
        imageUrl,
        updatedAt: new Date()
      },
      include: {
        InsuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    // If patient had a previous image, delete it
    if (patient.imageUrl && patient.imageUrl.startsWith('/uploads/patients/')) {
      const oldFilename = path.basename(patient.imageUrl);
      const oldPath = path.join(process.cwd(), 'uploads', 'patients', oldFilename);

      try {
        await unlinkAsync(oldPath);
        console.log('✅ Deleted old patient image:', oldFilename);
      } catch (error) {
        console.warn('⚠️ Could not delete old image:', error);
      }
    }

    // Add fullName for backward compatibility
    const patientWithFullName = {
      ...updatedPatient,
      fullName: `${updatedPatient.surname} ${updatedPatient.otherNames}`.trim()
    };

    console.log('✅ Patient image uploaded successfully (base64):', patientId);

    res.json({
      success: true,
      data: {
        imageUrl,
        patient: patientWithFullName
      },
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Error uploading patient image (base64):', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};
