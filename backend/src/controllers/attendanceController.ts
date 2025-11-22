// controllers/attendanceController.ts - COMPLETE UPDATED VERSION
import { Request, Response } from 'express';
import { PrismaClient, EncounterCategory, VisitCategory, AttendanceStatus, PaymentMode, AdmissionType } from '@prisma/client';
import { body, validationResult } from 'express-validator';

// Import the services
import { BillingService } from '../services/BillingService';
import { InsuranceService } from '../services/InsuranceService';

const prisma = new PrismaClient();

// ✅ UPDATED: Valid attendance types (removed general_consultation)
const VALID_ATTENDANCE_TYPES = [
  'emergency_acute',
  'antenatal',
  'postnatal',
  'chronic_followup',
  'specialist_consultation',
  'delivery',
  'surgery'
];

// ✅ ADD THIS VALIDATION FUNCTION AT THE TOP
const validateAttendanceAllowsServiceAddition = async (attendanceId: string): Promise<void> => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { status: true }
  });

  if (!attendance) {
    throw new Error('Attendance not found');
  }

  // ✅ ONLY allow service additions when attendance is pending
  if (attendance.status !== 'pending') {
    throw new Error(`Cannot add services to ${attendance.status} attendance. Only pending attendances allow service additions.`);
  }
};

// ✅ FIXED: Calculate age from patient's dateOfBirth and attendance date
const calculateAgeAtAttendance = (dateOfBirth: Date, attendanceDate: Date): number => {
  const birthDate = new Date(dateOfBirth);
  const attendance = new Date(attendanceDate);
  
  let age = attendance.getFullYear() - birthDate.getFullYear();
  const monthDiff = attendance.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && attendance.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// ✅ NEW: Determine GDRG category for NHIS claims
const determineGDRGCategory = (attendanceType: string, patientAge: number, diagnoses: any[] = []): string => {
  // Base mapping by attendance type
  const baseMapping: Record<string, string> = {
    'emergency_acute': 'adult_medicine',
    'antenatal': 'obstetrics_gynaecology', 
    'postnatal': 'obstetrics_gynaecology',
    'chronic_followup': 'adult_medicine',
    'specialist_consultation': 'specialist',
    'delivery': 'obstetrics_gynaecology',
    'surgery': 'adult_surgery'
  };

  let baseCategory = baseMapping[attendanceType] || 'out_patient';

  // Pediatric adjustment
  if (patientAge < 12) {
    const pediatricMap: Record<string, string> = {
      'adult_medicine': 'paediatrics',
      'adult_surgery': 'paediatric_surgery',
      'out_patient': 'paediatrics',
    };
    baseCategory = pediatricMap[baseCategory] || baseCategory;
  }

  return baseCategory;
};

// ✅ NEW: Determine service category
const determineServiceCategory = (attendanceType: string): string => {
  const mapping: Record<string, string> = {
    'emergency_acute': 'opd',
    'antenatal': 'opd',
    'postnatal': 'opd',
    'chronic_followup': 'opd',
    'specialist_consultation': 'opd',
    'delivery': 'ipd',
    'surgery': 'ipd'
  };
  return mapping[attendanceType] || 'opd';
};

// ✅ UPDATED: Determine encounter category
const determineNHISEncounterType = (attendanceType: string, admissionId?: string): string => {
  if (admissionId) return 'ipd';
  
  // Delivery and Surgery are typically IPD
  if (['delivery', 'surgery'].includes(attendanceType)) {
    return 'ipd';
  }
  
  return 'opd';
};

// ✅ Map to visit category
const mapToNHISVisitCategory = (attendanceType: string): string => {
  const mapping: Record<string, string> = {
    'emergency_acute': 'emergency',
    'specialist_consultation': 'specialist',
    'delivery': 'inpatient',
    'surgery': 'inpatient',
    'antenatal': 'general',
    'postnatal': 'general',
    'chronic_followup': 'general'
  };
  return mapping[attendanceType] || 'general';
};

// ✅ Map attendance types to default service codes
const getDefaultServiceCode = (type: string): string | null => {
  const map: Record<string, string> = {
    'emergency_acute': 'OPDCO6A',
    'specialist_consultation': 'OPDCO6A',
    'antenatal': 'OPDCO2A',
    'postnatal': 'OPDCO2A',
    'chronic_followup': 'OPDCO6A',
    'delivery': 'OBGY34A',
    'surgery': 'ASURO1A'
  };
  return map[type] || null;
};

// Helper function to identify chronic conditions
const isChronicDiagnosis = (diagnosis: any): boolean => {
  const chronicConditions = [
    'hypertension', 'diabetes', 'asthma', 'copd', 'heart disease',
    'chronic kidney disease', 'arthritis', 'hiv', 'epilepsy'
  ];
  
  return chronicConditions.some(condition => 
    diagnosis.name?.toLowerCase().includes(condition) ||
    diagnosis.icdCode?.startsWith('I10') ||
    diagnosis.icdCode?.startsWith('E11') ||
    diagnosis.icdCode?.startsWith('J45')
  );
};

// ✅ FIXED: addServiceToAttendanceAndBill helper function with correct field names
const addServiceToAttendanceAndBill = async (
  attendanceId: string,
  serviceCatalogId: string, // ✅ FIXED: serviceCatalogId
  userId: string,
  quantity = 1
) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      servicesRendered: true
    }
  });

  if (!attendance) throw new Error('Attendance not found');

  // ✅ ADDED: Check if service already exists to prevent duplicates
  const existingService = attendance.servicesRendered.find(
    s => s.serviceCatalogId === serviceCatalogId // ✅ FIXED: serviceCatalogId
  );

  if (existingService) {
    console.log(`Service ${serviceCatalogId} already exists for attendance ${attendanceId}`);
    return attendance; // Return without adding duplicate
  }

  // Add new service
  await prisma.serviceRendered.create({
    data: {
      attendanceId,
      serviceCatalogId, // ✅ FIXED: serviceCatalogId
      quantity,
      date: new Date(),
      performedById: userId
    }
  });

  // Regenerate bill
  await BillingService.generateBillFromAttendance(attendanceId);

  return attendance;
};

// ✅ NHIS CLAIM VALIDATION
export const validateNHISClaim = async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const validation = await InsuranceService.validateClaimReadiness(attendanceId, 'NHIS');
    
    res.json({
      message: validation.isValid ? 'Claim is valid' : 'Claim validation failed',
      ...validation
    });
  } catch (error) {
    console.error('Error validating NHIS claim:', error);
    res.status(500).json({ 
      message: 'Error validating NHIS claim', 
      error: (error as Error).message 
    });
  }
};

// ✅ GET ALL ATTENDANCES - UPDATED WITH CORRECT RELATIONS
export const getAttendances = async (req: Request, res: Response) => {
  try {
    const { 
      patientId, 
      status, 
      attendanceType, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 50 
    } = req.query;

    const where: any = {};
    
    if (patientId) where.patientId = patientId as string;
    if (status) where.status = status as string;
    
    // ✅ UPDATED: Handle new attendance types
    if (attendanceType) {
      const requestedType = attendanceType as string;
      
      if (VALID_ATTENDANCE_TYPES.includes(requestedType)) {
        where.attendanceType = requestedType;
      }
    }
    
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = new Date(dateFrom as string);
      if (dateTo) where.dateTime.lte = new Date(dateTo as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({ // ✅ FIXED: lowercase 'attendance'
        where,
        include: {
          Patient: { // ✅ CORRECT
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true,
              dateOfBirth: true,
              gender: true
            }
          },
          User_Attendance_createdByIdToUser: { // ✅ FIXED
            select: {
              fullName: true,
              username: true
            }
          },
          Admission: { // ✅ FIXED: Use singular
            select: {
              admissionNumber: true,
              status: true,
              admissionType: true
            }
          },
          Bed: { // ✅ CORRECT
            select: {
              bedNumber: true
            }
          },
          Ward: { // ✅ CORRECT
            select: {
              wardName: true,
              wardType: true
            }
          },
          Bill: { // ✅ CORRECT
            select: {
              billNumber: true,
              totalAmount: true,
              status: true
            }
          },
          AttendanceDiagnosis: { // ✅ FIXED
            include: {
              Diagnosis: {
                select: {
                  name: true,
                  icdCode: true
                }
              }
            }
          },
          LabTest: { // ✅ FIXED: Use singular
            include: {
              ServiceCatalog: { // ✅ FIXED
                select: {
                  name: true,
                  code: true
                }
              }
            }
          },
          Procedure: { // ✅ FIXED: Use singular
            include: {
              ServiceCatalog: { // ✅ FIXED
                select: {
                  name: true,
                  code: true
                }
              }
            }
          },
          Medication: { // ✅ FIXED: Use singular
            include: {
              ServiceCatalog: { // ✅ FIXED
                select: {
                  name: true,
                  code: true
                }
              },
              StockItem: { // ✅ FIXED
                select: {
                  name: true,
                  drugCode: true,
                  strength: true
                }
              }
            }
          },
          ServiceRendered: { // ✅ FIXED: Use singular
            include: {
              ServiceCatalog: { // ✅ FIXED
                select: {
                  name: true,
                  code: true,
                  nhisServiceCode: true,
                  serviceCategory: true
                }
              }
            }
          }
        },
        orderBy: {
          dateTime: 'desc'
        },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.attendance.count({ where }) // ✅ FIXED: lowercase
    ]);

    const attendancesWithFullName = attendances.map(attendance => ({
      ...attendance,
      patient: attendance.patient ? {
        ...attendance.patient,
        fullName: `${attendance.patient.surname} ${attendance.patient.otherNames}`.trim()
      } : null
    }));

    res.json({
      attendances: attendancesWithFullName,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching attendances:', error);
    res.status(500).json({ 
      message: 'Error fetching attendances', 
      error: (error as Error).message 
    });
  }
};

// ✅ GET ATTENDANCE BY ID - UPDATED WITH CORRECT RELATIONS
export const getAttendanceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (id === 'new') {
      return res.status(400).json({ 
        message: 'Invalid attendance ID. "new" is not a valid ID.' 
      });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            gender: true,
            dateOfBirth: true
          }
        },
        // ✅ FIX: Use correct relation names
        User_Attendance_createdByIdToUser: {
          select: {
            fullName: true,
            username: true
          }
        },
        User_Attendance_updatedByIdToUser: {
          select: {
            fullName: true,
            username: true
          }
        },
        admission: true,
        bed: {
          select: {
            bedNumber: true,
            wardId: true
          }
        },
        ward: {
          select: {
            wardName: true,
            wardType: true
          }
        },
        bill: true,
        // ✅ FIX: Use correct relation names
        AttendanceDiagnosis: {
          include: {
            Diagnosis: true,
            User: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        },
        // ✅ FIX: Use correct relation names
        LabTest: {
          include: {
            ServiceCatalog: true,
            User_LabTest_performedByIdToUser: {
              select: {
                fullName: true,
                role: true
              }
            },
            User_LabTest_verifiedByIdToUser: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        },
        // ✅ FIX: Use correct relation names
        Procedure: {
          include: {
            ServiceCatalog: true,
            User_Procedure_performedByIdToUser: {
              select: {
                fullName: true,
                role: true
              }
            },
            User_Procedure_assistantIdToUser: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        },
        // ✅ FIX: Use correct relation names
        Medication: {
          include: {
            ServiceCatalog: true,
            StockItem: true,
            User_Medication_prescribedByIdToUser: {
              select: {
                fullName: true,
                role: true
              }
            },
            User_Medication_dispensedByIdToUser: {
              select: {
                fullName: true,
                role: true
              }
            },
            User_Medication_administeredByIdToUser: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        },
        // ✅ FIX: Use correct relation names
        ServiceRendered: {
          include: {
            ServiceCatalog: {
              select: {
                name: true,
                code: true,
                nhisServiceCode: true,
                description: true,
                serviceCategory: true
              }
            }
          }
        },
        // ✅ FIX: Use correct relation names
        Vitals: {
          include: {
            User: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    // Add fullName to patient
    const attendanceWithFullName = {
      ...attendance,
      patient: attendance.patient ? {
        ...attendance.patient,
        fullName: `${attendance.patient.surname} ${attendance.patient.otherNames}`.trim()
      } : null
    };

    res.json(attendanceWithFullName);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Error fetching attendance', error });
  }
};

// ✅ CREATE ATTENDANCE - UPDATED WITH SCHEMA FIXES
export const createAttendance = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('attendanceType').isIn(VALID_ATTENDANCE_TYPES).withMessage('Valid attendance type is required'),
  body('paymentMode').isIn(['cash', 'nhis', 'private_insurance']).withMessage('Valid payment mode is required'),
  body('nhisCCC')
    .optional()
    .custom((value, { req }) => {
      if (req.body.paymentMode === 'nhis') {
        if (!value || !/^\d{5}$/.test(value)) {
          throw new Error('NHIS CCC number must be exactly 5 digits for NHIS payments');
        }
      }
      return true;
    }),
  body('insuranceProviderId')
    .optional()
    .custom(async (value, { req }) => {
      if (req.body.paymentMode === 'private_insurance') {
        if (!value) {
          throw new Error('Insurance provider ID is required for private insurance');
        }
        
        const provider = await prisma.insuranceProvider.findUnique({
          where: { id: value }
        });
        
        if (!provider) {
          throw new Error('Insurance provider not found');
        }
        if (!provider.isActive) {
          throw new Error('Insurance provider is not active');
        }
        if (provider.type !== 'private') {
          throw new Error('Insurance provider must be of type private');
        }
        
        const patient = await prisma.patient.findUnique({
          where: { id: req.body.patientId },
          include: { insuranceProvider: true }
        });
        
        if (!patient?.insuranceProviderId || patient.insuranceProviderId !== value) {
          throw new Error('Patient is not linked to this insurance provider');
        }
      }
      return true;
    }),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const patient = await prisma.patient.findUnique({
        where: { id: req.body.patientId }
      });

      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      if (req.body.paymentMode === 'nhis' && !req.body.nhisCCC) {
        return res.status(400).json({ message: 'NHIS CCC code is required for NHIS attendances' });
      }

      if (req.body.paymentMode === 'private_insurance' && !req.body.insuranceProviderId) {
        return res.status(400).json({ message: 'Insurance provider is required for private insurance attendances' });
      }

      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'User authentication required' });
      }

      // AUTO-SET NHIS PROVIDER IF PAYMENT MODE IS NHIS
      let insuranceProviderId = req.body.insuranceProviderId;
      
      if (req.body.paymentMode === 'nhis' && !insuranceProviderId) {
        const nhisProviderId = await InsuranceService.findNHISProvider();
        if (nhisProviderId) {
          insuranceProviderId = nhisProviderId;
          console.log('🔗 Auto-linked NHIS provider:', nhisProviderId);
        } else {
          return res.status(400).json({ 
            message: 'NHIS insurance provider not found in system. Please contact administrator.' 
          });
        }
      }

      // Get previous attendances for chronic condition carry-forward
      const previousAttendances = await prisma.attendance.findMany({
        where: { patientId: req.body.patientId },
        include: {
          diagnoses: {
            include: {
              diagnosis: true
            }
          },
          medications: {
            include: {
              stockItem: true
            }
          }
        },
        orderBy: {
          dateTime: 'desc'
        },
        take: 5
      });

      const lastAttendance = previousAttendances[0];
      const chronicDiagnoses: any[] = [];
      const ongoingMedications: any[] = [];

      if (lastAttendance) {
        for (const d of lastAttendance.diagnoses) {
          if (d.diagnosis && isChronicDiagnosis(d.diagnosis)) {
            chronicDiagnoses.push({
              diagnosisId: d.diagnosisId,
              notes: `Carried forward from previous visit (${lastAttendance.attendanceNumber})`,
              primary: false,
              date: new Date(),
              createdById: user.id
            });
          }
        }

        for (const m of lastAttendance.medications) {
          if (m.status === 'prescribed' || m.status === 'administered') {
            ongoingMedications.push({
              stockItemId: m.stockItemId,
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              quantity: m.quantity,
              route: m.route,
              instructions: m.instructions,
              status: 'prescribed',
              prescribedAt: new Date(),
              prescribedById: user.id,
              notes: 'Continued from previous visit'
            });
          }
        }
      }

      // ✅ Determine categories with new helper functions
      const encounterCategory = determineNHISEncounterType(
        req.body.attendanceType,
        req.body.admissionId
      );

      const patientAge = calculateAgeAtAttendance(patient.dateOfBirth, new Date());
      const gdrgCategory = determineGDRGCategory(req.body.attendanceType, patientAge);
      const serviceCategory = determineServiceCategory(req.body.attendanceType);

      // ✅ GENERATE ATTENDANCE NUMBER
      const generateAttendanceNumber = async (): Promise<string> => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const monthlyCount = await prisma.attendance.count({
          where: {
            dateTime: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        });
        
        const sequence = String(monthlyCount + 1).padStart(4, '0');
        return `ATT-${sequence}`;
      };

      const attendanceNumber = await generateAttendanceNumber();

      // Create attendance
      const attendance = await prisma.attendance.create({
        data: {
          attendanceNumber,
          patientId: req.body.patientId,
          insuranceProviderId: insuranceProviderId,
          dateTime: req.body.dateTime ? new Date(req.body.dateTime) : new Date(),
          attendanceType: req.body.attendanceType,
          paymentMode: req.body.paymentMode,
          nhisCCC: req.body.nhisCCC,
          complaints: req.body.complaints || 'No complaints recorded',
          visitCategory: mapToNHISVisitCategory(req.body.attendanceType) as any,
          encounterCategory: encounterCategory as any,
          gdrgCategory, // ✅ ADDED
          serviceCategory: serviceCategory as any, // ✅ ADDED
          referringFacility: req.body.referringFacility,
          createdById: user.id,
          diagnoses: chronicDiagnoses.length > 0 ? {
            create: chronicDiagnoses
          } : undefined,
          medications: ongoingMedications.length > 0 ? {
            create: ongoingMedications
          } : undefined
        },
        include: {
          patient: true,
          insuranceProvider: true
        }
      });

      // ✅ FIXED: Add default consultation service with correct field names
      const defaultCode = getDefaultServiceCode(req.body.attendanceType);
      if (defaultCode) {
        const service = await prisma.serviceCatalog.findFirst({
          where: { 
            code: defaultCode, 
            isActive: true
          }
        });
        
        if (service) {
          await prisma.serviceRendered.create({
            data: {
              attendanceId: attendance.id,
              serviceCatalogId: service.id, // ✅ FIXED: serviceCatalogId
              quantity: 1,
              date: new Date(),
              performedById: user.id
            }
          });
        }
      }

      // Create bill
      const billNumber = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const bill = await prisma.bill.create({
        data: {
          billNumber,
          patientId: req.body.patientId,
          attendanceId: attendance.id,
          billDate: new Date(),
          items: [],
          totalAmount: 0,
          status: 'draft',
          paymentMode: req.body.paymentMode,
          createdById: user.id
        }
      });

      // ✅ Generate initial bill using BillingService
      await BillingService.generateBillFromAttendance(attendance.id);

      // If delivery or surgery, might create admission
      if (['delivery', 'surgery'].includes(req.body.attendanceType)) {
        // Add logic for automatic admission if needed
        console.log(`⚠️ Consider creating admission for ${req.body.attendanceType} attendance`);
      }

      const populatedAttendance = await prisma.attendance.findUnique({
        where: { id: attendance.id },
        include: {
          Patient: { // ✅ FIXED
            include: {
              InsuranceProvider: true // ✅ FIXED
            }
          },
          User_Attendance_createdByIdToUser: true, // ✅ FIXED
          Admission: true, // ✅ FIXED: Use singular
          Bill: true, // ✅ CORRECT
          ServiceRendered: { // ✅ FIXED: Use singular
            include: {
              ServiceCatalog: true // ✅ FIXED
            }
          }
        }
      });

      res.status(201).json({
        message: 'Attendance created successfully',
        attendance: populatedAttendance,
        categories: {
          encounterCategory,
          visitCategory: mapToNHISVisitCategory(req.body.attendanceType),
          gdrgCategory,
          serviceCategory
        }
      });
    } catch (error) {
      console.error('Error creating attendance:', error);
      res.status(500).json({ 
        message: 'Error creating attendance', 
        error: (error as Error).message 
      });
    }
  }
];

// ✅ UPDATED: LAB TESTS - USING SERVICE CATALOG DIRECTLY
export const addLabTestToAttendance = [
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'), // ✅ UPDATED
  body('priority').optional().isIn(['routine', 'urgent', 'stat']),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceCatalogId, priority, notes } = req.body; // ✅ UPDATED
      const user = (req as any).user;
      
      // ✅ VALIDATE SERVICE EXISTS AND IS LAB TEST TYPE
      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId } // ✅ UPDATED
      });

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      if (service.serviceType !== 'lab_test') {
        return res.status(400).json({ message: 'Service is not a lab test type' });
      }

      const attendance = await prisma.attendance.findUnique({
        where: { id: req.params.id }
      });

      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      // ✅ CREATE LAB TEST WITH SERVICE CATALOG LINK
      await prisma.labTest.create({
        data: {
          attendanceId: req.params.id,
          serviceCatalogId: serviceCatalogId, // ✅ UPDATED
          status: 'requested',
          priority: priority || 'routine',
          requestedAt: new Date(),
          createdById: user.id,
          notes
        }
      });

      // Auto-add service & bill
      await addServiceToAttendanceAndBill(req.params.id, serviceCatalogId, user.id);

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          labTests: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          servicesRendered: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          bill: true
        }
      });
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding lab test:', error);
      res.status(500).json({ message: 'Error adding lab test', error });
    }
  }
];

// ✅ UPDATED: PROCEDURES - USING SERVICE CATALOG DIRECTLY
export const addProcedureToAttendance = [
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'), // ✅ UPDATED
  body('scheduledDate').optional().isISO8601().withMessage('Scheduled date must be valid'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceCatalogId, scheduledDate, notes, assistantId } = req.body; // ✅ UPDATED
      const user = (req as any).user;
      
      // ✅ VALIDATE SERVICE EXISTS AND IS PROCEDURE TYPE
      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId } // ✅ UPDATED
      });

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      if (service.serviceType !== 'procedure') {
        return res.status(400).json({ message: 'Service is not a procedure type' });
      }

      await prisma.procedure.create({
        data: {
          attendanceId: req.params.id,
          serviceCatalogId: serviceCatalogId, // ✅ UPDATED
          status: 'scheduled',
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          notes: notes || '',
          assistantId: assistantId,
          createdById: user.id
        }
      });

      // Auto-add service & bill
      await addServiceToAttendanceAndBill(req.params.id, serviceCatalogId, user.id);

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          procedures: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          servicesRendered: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding procedure:', error);
      res.status(500).json({ message: 'Error adding procedure', error });
    }
  }
];

// ✅ UPDATED: SCANS - USING SERVICE CATALOG DIRECTLY
export const addScanToAttendance = [
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'), // ✅ UPDATED
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceCatalogId, priority, notes } = req.body; // ✅ UPDATED
      const user = (req as any).user;
      
      // ✅ VALIDATE SERVICE EXISTS AND IS SCAN TYPE
      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId } // ✅ UPDATED
      });

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      if (service.serviceType !== 'scan') {
        return res.status(400).json({ message: 'Service is not a scan type' });
      }

      await prisma.scan.create({
        data: {
          attendanceId: req.params.id,
          serviceCatalogId: serviceCatalogId, // ✅ UPDATED
          status: 'requested',
          priority: priority || 'routine',
          requestedAt: new Date(),
          createdById: user.id,
          notes
        }
      });

      // Auto-add service & bill
      await addServiceToAttendanceAndBill(req.params.id, serviceCatalogId, user.id);

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          scans: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          servicesRendered: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding scan:', error);
      res.status(500).json({ message: 'Error adding scan', error });
    }
  }
];

// ✅ FIXED: generateNHISClaimFromAttendance with correct field names
export const generateNHISClaimFromAttendance = async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params;

    console.log('🏥 Generating NHIS Claim from Attendance:', attendanceId);

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Patient: { // ✅ FIXED
          select: {
            surname: true,
            otherNames: true,
            dateOfBirth: true,
            gender: true
          }
        },
        AttendanceDiagnosis: { // ✅ FIXED
          include: {
            Diagnosis: {
              select: {
                name: true,
                icdCode: true,
                gdrgCode: true
              }
            }
          }
        },
        ServiceRendered: { // ✅ FIXED: Use singular
          include: {
            ServiceCatalog: { // ✅ FIXED
              select: {
                name: true,
                code: true,
                nhisServiceCode: true,
                serviceCategory: true
              }
            }
          }
        }
      }
    });

    if (!attendance) {
      return res.status(404).json({ 
        success: false,
        message: 'Attendance not found' 
      });
    }

    // Validate NHIS attendance
    if (attendance.paymentMode !== 'nhis') {
      return res.status(400).json({
        success: false,
        message: 'Only NHIS attendances can generate NHIS claims'
      });
    }

    if (!attendance.nhisCCC) {
      return res.status(400).json({
        success: false,
        message: 'NHIS CCC number is required for claim generation'
      });
    }

    // ✅ FIXED: Prepare NHIS services with correct field names
    const nhisServices = attendance.servicesRendered
      .filter(service => service.serviceCatalog.nhisServiceCode) // ✅ FIXED: serviceCatalog
      .map(service => ({
        description: service.serviceCatalog.name, // ✅ FIXED: serviceCatalog
        nhisServiceCode: service.serviceCatalog.nhisServiceCode, // ✅ FIXED: serviceCatalog
        quantity: service.quantity,
        // ✅ NO PRICES SUBMITTED TO NHIS - they use their own tariff
      }));

    if (nhisServices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No NHIS-covered services found for this attendance'
      });
    }

    const primaryDiagnosis = attendance.diagnoses.find(d => d.primary) || attendance.diagnoses[0];

    // ✅ FIXED: Compose patient name from schema fields
    const patientFullName = `${attendance.patient.surname} ${attendance.patient.otherNames}`.trim();

    // Prepare NHIS claim data (no prices)
    const claimData = {
      claimType: 'NHIS',
      encounterType: attendance.encounterCategory,
      patient: {
        nhisNumber: attendance.nhisCCC,
        fullName: patientFullName,
        dateOfBirth: attendance.patient.dateOfBirth,
        gender: attendance.patient.gender
      },
      clinical: {
        attendanceDate: attendance.dateTime,
        gdrgCategory: attendance.gdrgCategory, // ✅ ADDED
        primaryDiagnosis: primaryDiagnosis ? {
          description: primaryDiagnosis.diagnosis.name,
          icdCode: primaryDiagnosis.diagnosis.icdCode,
          gdrgCode: primaryDiagnosis.diagnosis.gdrgCode
        } : null
      },
      services: nhisServices,
      metadata: {
        totalServices: nhisServices.length,
        servicesWithNHISCodes: nhisServices.length,
        totalServicesRendered: attendance.servicesRendered.length
      }
    };

    console.log('✅ NHIS Claim data prepared successfully (no prices submitted)');

    res.json({
      success: true,
      message: 'NHIS claim data generated successfully',
      data: claimData,
      note: 'NHIS claims only submit service codes - NHIS determines pricing from their tariff',
      validation: {
        hasPrimaryDiagnosis: !!primaryDiagnosis,
        hasNHISServices: nhisServices.length > 0,
        hasValidNHISNumber: !!attendance.nhisCCC,
        meetsClaimRequirements: !!primaryDiagnosis && nhisServices.length > 0 && !!attendance.nhisCCC
      }
    });

  } catch (error) {
    console.error('❌ Error generating NHIS claim from attendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating NHIS claim from attendance', 
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ... Export other functions (they remain largely the same with field name updates) ...
// ✅ UPDATE ATTENDANCE STATUS
export const updateAttendanceStatus = [
  body('status').isIn(['pending','completed', 'cancelled', 'admitted', 'discharged'])
    .withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, dischargeNotes, followUpDate } = req.body;
      const user = (req as any).user;
      
      const updateData: any = { 
        status,
        updatedById: user.id,
        updatedAt: new Date()
      };
      
      if (status === 'discharged' && dischargeNotes) {
        updateData.medicalNotes = dischargeNotes;
      }

      if (followUpDate) {
        updateData.followUpDate = new Date(followUpDate);
      }

      const attendance = await prisma.attendance.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          patient: true,
          bill: true
        }
      });

      res.json(attendance);
    } catch (error) {
      console.error('Error updating attendance status:', error);
      res.status(500).json({ message: 'Error updating attendance status', error });
    }
  }
];

// ✅ ADD/REMOVE DIAGNOSIS - UNCHANGED (uses correct diagnosis relations)
export const addDiagnosisToAttendance = [
  body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { diagnosisId, notes, primary } = req.body;
      const user = (req as any).user;

      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId }
      });

      if (!diagnosis) {
        return res.status(404).json({ message: 'Diagnosis not found' });
      }

      const attendance = await prisma.attendance.findUnique({
        where: { id: req.params.id }
      });

      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      // If primary, unset other primary diagnoses
      if (primary) {
        await prisma.attendanceDiagnosis.updateMany({
          where: {
            attendanceId: req.params.id,
            primary: true
          },
          data: { primary: false }
        });
      }

      await prisma.attendanceDiagnosis.create({
        data: {
          attendanceId: req.params.id,
          diagnosisId,
          notes: notes || '',
          primary: !!primary,
          date: new Date(),
          createdById: user.id,
          icdCode: diagnosis.icdCode
        }
      });

      const updated = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          diagnoses: {
            include: {
              diagnosis: true
            }
          },
          bill: true
        }
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error adding diagnosis:', error);
      res.status(500).json({ message: 'Error adding diagnosis', error: (error as Error).message });
    }
  }
];

export const removeDiagnosisFromAttendance = async (req: Request, res: Response) => {
  try {
    await prisma.attendanceDiagnosis.delete({
      where: { id: req.params.diagnosisId }
    });

    const updatedAttendance = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      include: {
        diagnoses: {
          include: {
            diagnosis: true
          }
        }
      }
    });

    res.json(updatedAttendance);
  } catch (error) {
    console.error('Error removing diagnosis:', error);
    res.status(500).json({ message: 'Error removing diagnosis', error });
  }
};

// ✅ UPDATED: MEDICATIONS - USING SERVICE CATALOG FOR PRICING
export const addMedicationToAttendance = [
  body('stockItemId').notEmpty().withMessage('Stock item ID is required'),
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required for pricing'), // ✅ ADDED
  body('name').notEmpty().withMessage('Medication name is required'),
  body('dosage').notEmpty().withMessage('Dosage is required'),
  body('frequency').notEmpty().withMessage('Frequency is required'),
  body('duration').notEmpty().withMessage('Duration is required'),
  body('quantity').isNumeric().withMessage('Quantity must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        stockItemId, 
        serviceCatalogId, // ✅ ADDED for pricing
        name, 
        dosage, 
        frequency, 
        duration, 
        quantity = 1, 
        route, 
        instructions, 
        notes 
      } = req.body;
      
      const user = (req as any).user;

      // ✅ VALIDATE STOCK ITEM EXISTS
      const stockItem = await prisma.stockItem.findUnique({
        where: { id: stockItemId }
      });

      if (!stockItem) {
        return res.status(404).json({ message: 'Stock item not found' });
      }

      // ✅ VALIDATE SERVICE CATALOG EXISTS AND IS MEDICATION TYPE
      const serviceCatalog = await prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId }
      });

      if (!serviceCatalog) {
        return res.status(404).json({ message: 'Service catalog item not found' });
      }

      if (serviceCatalog.serviceType !== 'medication') {
        return res.status(400).json({ message: 'Service is not a medication type' });
      }

      // ✅ CREATE MEDICATION WITH BOTH LINKS
      await prisma.medication.create({
        data: {
          attendanceId: req.params.id,
          stockItemId, // For inventory tracking
          serviceCatalogId, // ✅ ADDED for pricing
          name: stockItem.name || name,
          dosage,
          frequency: frequency || 'As directed',
          duration: duration || 'Until finished',
          quantity,
          route: route || 'Oral',
          instructions: instructions || '',
          status: 'prescribed',
          prescribedAt: new Date(),
          prescribedById: user.id,
          notes
        }
      });

      // ✅ Auto-add service & bill USING SERVICE CATALOG
      await addServiceToAttendanceAndBill(req.params.id, serviceCatalogId, user.id, quantity);

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          medications: {
            include: {
              serviceCatalog: true, // ✅ UPDATED for pricing
              stockItem: true // For inventory info
            }
          },
          servicesRendered: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          bill: true
        }
      });
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding medication:', error);
      res.status(500).json({ message: 'Error adding medication', error });
    }
  }
];

export const updateMedicationStatus = [
  body('status').isIn(['prescribed', 'dispensed', 'administered', 'cancelled'])
    .withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, dispensedAt, dispensedById, administeredAt, administeredById } = req.body;
      const user = (req as any).user;
      
      const updateData: any = { status };
      
      if (status === 'dispensed') {
        updateData.dispensedAt = dispensedAt ? new Date(dispensedAt) : new Date();
        updateData.dispensedById = dispensedById || user.id;
      }
      
      if (status === 'administered') {
        updateData.administeredAt = administeredAt ? new Date(administeredAt) : new Date();
        updateData.administeredById = administeredById || user.id;
      }

      await prisma.medication.update({
        where: { id: req.params.medicationId },
        data: updateData
      });

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          medications: {
            include: {
              serviceCatalog: true, // ✅ UPDATED
              stockItem: true
            }
          },
          bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating medication:', error);
      res.status(500).json({ message: 'Error updating medication', error });
    }
  }
];

export const removeMedicationFromAttendance = async (req: Request, res: Response) => {
  try {
    const medication = await prisma.medication.findUnique({
      where: { id: req.params.medicationId },
      select: { serviceCatalogId: true }
    });

    await prisma.medication.delete({
      where: { id: req.params.medicationId }
    });

    // ✅ ALSO REMOVE THE ASSOCIATED SERVICE IF EXISTS
    if (medication?.serviceCatalogId) {
      const serviceRendered = await prisma.serviceRendered.findFirst({
        where: {
          attendanceId: req.params.id,
          serviceCatalogId: medication.serviceCatalogId
        }
      });

      if (serviceRendered) {
        await prisma.serviceRendered.delete({
          where: { id: serviceRendered.id }
        });

        // Regenerate bill
        await BillingService.generateBillFromAttendance(req.params.id);
      }
    }

    res.json({ message: 'Medication removed successfully' });
  } catch (error) {
    console.error('Error removing medication:', error);
    res.status(500).json({ message: 'Error removing medication', error });
  }
};

// ✅ UPDATE LAB TEST STATUS
export const updateLabTestStatus = [
  body('status').isIn(['requested', 'completed', 'cancelled']).withMessage('Valid status is required'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, result, normalRange, units, performedById, verifiedById, notes } = req.body;
      
      const updateData: any = { status };
      if (result !== undefined) updateData.result = result;
      if (normalRange) updateData.normalRange = normalRange;
      if (units) updateData.units = units;
      if (performedById) updateData.performedById = performedById;
      if (verifiedById) updateData.verifiedById = verifiedById;
      if (notes) updateData.notes = notes;
      if (status === 'completed') updateData.completedAt = new Date();

      await prisma.labTest.update({
        where: { id: req.params.labTestId },
        data: updateData
      });

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          labTests: {
            include: {
              serviceCatalog: true, // ✅ UPDATED
              performedBy: true,
              verifiedBy: true
            }
          },
          bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating lab test:', error);
      res.status(500).json({ message: 'Error updating lab test', error });
    }
  }
];

export const removeLabTestFromAttendance = async (req: Request, res: Response) => {
  try {
    const labTest = await prisma.labTest.findUnique({
      where: { id: req.params.labTestId },
      select: { serviceCatalogId: true }
    });

    await prisma.labTest.delete({
      where: { id: req.params.labTestId }
    });

    // ✅ ALSO REMOVE THE ASSOCIATED SERVICE IF EXISTS
    if (labTest?.serviceCatalogId) {
      const serviceRendered = await prisma.serviceRendered.findFirst({
        where: {
          attendanceId: req.params.id,
          serviceCatalogId: labTest.serviceCatalogId
        }
      });

      if (serviceRendered) {
        await prisma.serviceRendered.delete({
          where: { id: serviceRendered.id }
        });

        // Regenerate bill
        await BillingService.generateBillFromAttendance(req.params.id);
      }
    }

    res.json({ message: 'Lab test removed successfully' });
  } catch (error) {
    console.error('Error removing lab test:', error);
    res.status(500).json({ message: 'Error removing lab test', error });
  }
};

// ✅ UPDATE PROCEDURE STATUS
export const updateProcedureStatus = [
  body('status').isIn(['scheduled', 'completed', 'cancelled']).withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, performedAt, performedById, notes, complications, outcome } = req.body;
      
      const updateData: any = { status };
      if (performedAt) updateData.performedAt = new Date(performedAt);
      if (performedById) updateData.performedById = performedById;
      if (notes) updateData.notes = notes;
      if (complications) updateData.complications = complications;
      if (outcome) updateData.outcome = outcome;

      await prisma.procedure.update({
        where: { id: req.params.procedureId },
        data: updateData
      });

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          procedures: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating procedure:', error);
      res.status(500).json({ message: 'Error updating procedure', error });
    }
  }
];

export const removeProcedureFromAttendance = async (req: Request, res: Response) => {
  try {
    const procedure = await prisma.procedure.findUnique({
      where: { id: req.params.procedureId },
      select: { serviceCatalogId: true }
    });

    await prisma.procedure.delete({
      where: { id: req.params.procedureId }
    });

    // ✅ ALSO REMOVE THE ASSOCIATED SERVICE IF EXISTS
    if (procedure?.serviceCatalogId) {
      const serviceRendered = await prisma.serviceRendered.findFirst({
        where: {
          attendanceId: req.params.id,
          serviceCatalogId: procedure.serviceCatalogId
        }
      });

      if (serviceRendered) {
        await prisma.serviceRendered.delete({
          where: { id: serviceRendered.id }
        });

        // Regenerate bill
        await BillingService.generateBillFromAttendance(req.params.id);
      }
    }

    res.json({ message: 'Procedure removed successfully' });
  } catch (error) {
    console.error('Error removing procedure:', error);
    res.status(500).json({ message: 'Error removing procedure', error });
  }
};

// ✅ UPDATE SCAN STATUS
export const updateScanStatus = [
  body('status').isIn(['requested', 'completed', 'cancelled']).withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, result, findings, impression, performedById, imageUrls } = req.body;
      
      const updateData: any = { status };
      if (result) updateData.result = result;
      if (findings) updateData.findings = findings;
      if (impression) updateData.impression = impression;
      if (performedById) updateData.performedById = performedById;
      if (imageUrls) updateData.imageUrls = imageUrls;
      if (status === 'completed') updateData.completedAt = new Date();

      await prisma.scan.update({
        where: { id: req.params.scanId },
        data: updateData
      });

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          scans: {
            include: {
              serviceCatalog: true // ✅ UPDATED
            }
          },
          bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating scan:', error);
      res.status(500).json({ message: 'Error updating scan', error });
    }
  }
];

export const removeScanFromAttendance = async (req: Request, res: Response) => {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: req.params.scanId },
      select: { serviceCatalogId: true }
    });

    await prisma.scan.delete({
      where: { id: req.params.scanId }
    });

    // ✅ ALSO REMOVE THE ASSOCIATED SERVICE IF EXISTS
    if (scan?.serviceCatalogId) {
      const serviceRendered = await prisma.serviceRendered.findFirst({
        where: {
          attendanceId: req.params.id,
          serviceCatalogId: scan.serviceCatalogId
        }
      });

      if (serviceRendered) {
        await prisma.serviceRendered.delete({
          where: { id: serviceRendered.id }
        });

        // Regenerate bill
        await BillingService.generateBillFromAttendance(req.params.id);
      }
    }

    res.json({ message: 'Scan removed successfully' });
  } catch (error) {
    console.error('Error removing scan:', error);
    res.status(500).json({ message: 'Error removing scan', error });
  }
};

// ✅ VITALS - COMPLETE FIXED VERSION (UNCHANGED)
export const addVitalsToAttendance = [
  body('bloodPressure').optional().isString(),
  body('temperature').optional().isNumeric(),
  body('pulse').optional().isNumeric(),
  body('respiration').optional().isNumeric(),
  body('spo2').optional().isNumeric(),
  body('weight').optional().isNumeric(),
  body('height').optional().isNumeric(),
  body('notes').optional().isString(),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = (req as any).user;

      // ✅ GET ATTENDANCE FIRST TO GET patientId
      const attendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        select: { 
          patientId: true,
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          }
        }
      });

      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      // ✅ CALCULATE BMI IF WEIGHT AND HEIGHT PROVIDED
      const vitalsData: any = { ...req.body };
      if (vitalsData.weight && vitalsData.height) {
        const heightInMeters = vitalsData.height / 100;
        vitalsData.bmi = parseFloat((vitalsData.weight / (heightInMeters * heightInMeters)).toFixed(1));
      }

      // ✅ CREATE VITALS WITH ALL FIELDS
      const newVitals = await prisma.vitals.create({
        data: {
          attendanceId: req.params.id,
          patientId: attendance.patientId,
          bloodPressure: vitalsData.bloodPressure,
          temperature: vitalsData.temperature,
          pulse: vitalsData.pulse,
          respiration: vitalsData.respiration,
          spo2: vitalsData.spo2,
          weight: vitalsData.weight,
          height: vitalsData.height,
          bmi: vitalsData.bmi,
          notes: vitalsData.notes,
          recordedAt: new Date(),
          recordedById: user.id
        },
        include: {
          User: { // ✅ FIXED
            select: {
              fullName: true,
              role: true
            }
          },
          Patient: { // ✅ FIXED
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Vitals recorded successfully',
        vitals: newVitals
      });
    } catch (error: any) {
      console.error('Error adding vitals:', error);
      res.status(500).json({ 
        message: 'Error adding vitals', 
        error: error.message 
      });
    }
  }
];

export const getVitalsByAttendance = async (req: Request, res: Response) => {
  try {
    const vitals = await prisma.vitals.findMany({
      where: { attendanceId: req.params.id },
      include: {
        recordedBy: {
          select: {
            fullName: true,
            role: true
          }
        },
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        }
      },
      orderBy: {
        recordedAt: 'desc'
      }
    });

    res.json(vitals);
  } catch (error: any) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ 
      message: 'Error fetching vitals', 
      error: error.message 
    });
  }
};

// ✅ UPDATE VITALS
export const updateVitals = [
  body('bloodPressure').optional().isString(),
  body('temperature').optional().isNumeric(),
  body('pulse').optional().isNumeric(),
  body('respiration').optional().isNumeric(),
  body('spo2').optional().isNumeric(),
  body('weight').optional().isNumeric(),
  body('height').optional().isNumeric(),
  body('notes').optional().isString(),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { vitalsId } = req.params;
      const user = (req as any).user;

      // ✅ CHECK IF VITALS EXISTS AND BELONGS TO ATTENDANCE
      const existingVitals = await prisma.vitals.findFirst({
        where: { 
          id: vitalsId,
          attendanceId: req.params.id 
        }
      });

      if (!existingVitals) {
        return res.status(404).json({ 
          message: 'Vitals record not found for this attendance' 
        });
      }

      // ✅ CALCULATE BMI IF WEIGHT AND HEIGHT PROVIDED
      const updateData: any = { ...req.body };
      if (updateData.weight !== undefined && updateData.height !== undefined) {
        const heightInMeters = updateData.height / 100;
        updateData.bmi = parseFloat((updateData.weight / (heightInMeters * heightInMeters)).toFixed(1));
      } else if (updateData.weight !== undefined && existingVitals.height) {
        // Update BMI if weight changed but height remains
        const heightInMeters = existingVitals.height / 100;
        updateData.bmi = parseFloat((updateData.weight / (heightInMeters * heightInMeters)).toFixed(1));
      } else if (updateData.height !== undefined && existingVitals.weight) {
        // Update BMI if height changed but weight remains
        const heightInMeters = updateData.height / 100;
        updateData.bmi = parseFloat((existingVitals.weight / (heightInMeters * heightInMeters)).toFixed(1));
      }

      // ✅ UPDATE VITALS
      const updatedVitals = await prisma.vitals.update({
        where: { id: vitalsId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          recordedBy: {
            select: {
              fullName: true,
              role: true
            }
          },
          patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          attendance: {
            select: {
              attendanceNumber: true,
              dateTime: true
            }
          }
        }
      });

      res.json({
        message: 'Vitals updated successfully',
        vitals: updatedVitals
      });
    } catch (error: any) {
      console.error('Error updating vitals:', error);
      res.status(500).json({ 
        message: 'Error updating vitals', 
        error: error.message 
      });
    }
  }
];

// ✅ DELETE VITALS
export const deleteVitals = async (req: Request, res: Response) => {
  try {
    const { vitalsId } = req.params;

    // ✅ CHECK IF VITALS EXISTS AND BELONGS TO ATTENDANCE
    const existingVitals = await prisma.vitals.findFirst({
      where: { 
        id: vitalsId,
        attendanceId: req.params.id 
      }
    });

    if (!existingVitals) {
      return res.status(404).json({ 
        message: 'Vitals record not found for this attendance' 
      });
    }

    // ✅ DELETE VITALS
    await prisma.vitals.delete({
      where: { id: vitalsId }
    });

    res.json({
      message: 'Vitals record deleted successfully',
      deletedVitals: {
        id: existingVitals.id,
        recordedAt: existingVitals.recordedAt,
        patientId: existingVitals.patientId
      }
    });
  } catch (error: any) {
    console.error('Error deleting vitals:', error);
    res.status(500).json({ 
      message: 'Error deleting vitals', 
      error: error.message 
    });
  }
};

// ✅ FIXED: SERVICES & BILLING - USING SERVICE CATALOG
export const addServiceToAttendance = [
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const service = await prisma.serviceCatalog.findUnique({
        where: { id: req.body.serviceCatalogId }
      });

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      const attendance = await prisma.attendance.findUnique({
        where: { id: req.params.id }
      });

      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }

      await addServiceToAttendanceAndBill(
        req.params.id, 
        service.id,
        (req as any).user.id, 
        req.body.quantity || 1
      );

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          servicesRendered: {
            include: {
              serviceCatalog: true
            }
          },
          bill: true
        }
      });
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding service:', error);
      res.status(500).json({ message: 'Error adding service', error: (error as Error).message });
    }
  }
];

// ✅ UPDATE: Fix the getBillingBreakdown endpoint
export const getBillingBreakdown = async (req: Request, res: Response) => {
  try {
    const breakdown = await BillingService.getBillingBreakdown(req.params.id);
    res.json(breakdown);
  } catch (error) {
    console.error('Error getting billing breakdown:', error);
    res.status(500).json({ 
      message: 'Error getting billing breakdown', 
      error: (error as Error).message 
    });
  }
};

// ✅ UPDATE: Fix the removeServiceFromAttendance endpoint
export const removeServiceFromAttendance = async (req: Request, res: Response) => {
  try {
    await prisma.serviceRendered.delete({
      where: { id: req.params.serviceId }
    });

    // ✅ FIXED: Use the correct method after service removal
    await BillingService.generateBillFromAttendance(req.params.id);

    res.json({ message: 'Service removed successfully' });
  } catch (error) {
    console.error('Error removing service:', error);
    res.status(500).json({ message: 'Error removing service', error });
  }
};

// ✅ UPDATE: Fix the calculateAttendanceBill endpoint
export const calculateAttendanceBill = async (req: Request, res: Response) => {
  try {
    const billResult = await BillingService.generateBillFromAttendance(req.params.id);
    
    res.json({
      message: 'Bill calculated successfully',
      totalBill: billResult.summary.totalCashPrice,
      bill: billResult.bill,
      summary: billResult.summary
    });
  } catch (error) {
    console.error('Error calculating bill:', error);
    res.status(500).json({ message: 'Error calculating bill', error });
  }
};

// ✅ STATISTICS
export const getAttendanceStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate as string);
      if (endDate) where.dateTime.lte = new Date(endDate as string);
    }

    const [
      totalAttendances,
      pendingAttendances,
      completedAttendances,
      revenueData,
      typeBreakdown
    ] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({ where: { ...where, status: 'pending' } }),
      prisma.attendance.count({ where: { ...where, status: 'completed' } }),
      prisma.attendance.aggregate({
        where,
        _sum: {
          totalBill: true
        }
      }),
      prisma.attendance.groupBy({
        by: ['attendanceType'],
        where,
        _count: {
          id: true
        }
      })
    ]);

    const attendanceTypeBreakdown: Record<string, number> = {};
    typeBreakdown.forEach(item => {
      attendanceTypeBreakdown[item.attendanceType] = item._count.id;
    });

    res.json({
      totalAttendances,
      pendingAttendances,
      completedAttendances,
      totalRevenue: revenueData._sum.totalBill || 0,
      attendanceTypeBreakdown
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ message: 'Error fetching attendance stats', error });
  }
};

// ✅ DELETE ATTENDANCE
export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        patient: true,
        bill: true
      }
    });
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    if (attendance.billId) {
      return res.status(400).json({ 
        message: 'Cannot delete attendance with associated bill. Please delete the bill first.' 
      });
    }

    if (attendance.status === 'completed' || attendance.status === 'admitted') {
      return res.status(400).json({ 
        message: `Cannot delete ${attendance.status} attendance. Only pending can be deleted.` 
      });
    }

    await prisma.attendance.delete({
      where: { id }
    });

    res.json({ 
      message: 'Attendance deleted successfully',
      deletedAttendance: {
        id: attendance.id,
        attendanceNumber: attendance.attendanceNumber,
        patientName: attendance.patient ? 
          `${attendance.patient.surname} ${attendance.patient.otherNames}`.trim() : 
          'Unknown Patient',
        date: attendance.dateTime,
        status: attendance.status
      }
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ 
      message: 'Error deleting attendance', 
      error: (error as Error).message 
    });
  }
};

// ✅ UPDATE ATTENDANCE
export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    const attendance = await prisma.attendance.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        updatedById: user.id,
        updatedAt: new Date()
      },
      include: {
        Patient: true, // ✅ FIXED
        User_Attendance_createdByIdToUser: true, // ✅ FIXED
        User_Attendance_updatedByIdToUser: true, // ✅ FIXED
        AttendanceDiagnosis: { // ✅ FIXED
          include: {
            Diagnosis: true
          }
        },
        LabTest: { // ✅ FIXED: Use singular
          include: {
            ServiceCatalog: true // ✅ FIXED
          }
        },
        Procedure: { // ✅ FIXED: Use singular
          include: {
            ServiceCatalog: true // ✅ FIXED
          }
        },
        ServiceRendered: { // ✅ FIXED: Use singular
          include: {
            ServiceCatalog: true // ✅ FIXED
          }
        },
        Admission: true, // ✅ FIXED: Use singular
        Bill: true // ✅ CORRECT
      }
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ message: 'Error updating attendance', error });
  }
};