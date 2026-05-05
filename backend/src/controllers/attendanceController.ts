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

// ✅ FIXED: Allow service additions for pending AND admitted attendances
const validateAttendanceAllowsServiceAddition = async (attendanceId: string): Promise<void> => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { status: true }
  });

  if (!attendance) {
    throw new Error('Attendance not found');
  }

  // ✅ Allow service additions when attendance is pending OR admitted
  // Only block when status is 'completed' or 'discharged'
  if (attendance.status !== 'pending' && attendance.status !== 'admitted') {
    throw new Error(`Cannot add services to ${attendance.status} attendance. Only pending or admitted attendances allow service additions.`);
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

const addServiceToAttendanceAndBill = async (
  attendanceId: string,
  serviceCatalogId: string,
  userId: string,
  quantity = 1
) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { ServiceRendered: true }
  });

  if (!attendance) {
    throw new Error('Attendance not found');
  }

  const existingService = attendance.ServiceRendered.find(
    s => s.serviceItemId === serviceCatalogId
  );

  if (existingService) {
    console.log(`Service ${serviceCatalogId} already exists for attendance ${attendanceId}`);
    return attendance;
  }

  // ✅ FIXED: Use ONLY scalar fields - NO nested relation
  await prisma.serviceRendered.create({
    data: {
      attendanceId: attendanceId,
      serviceItemId: serviceCatalogId,
      quantity: quantity,
      date: new Date(),
      performedById: userId,
      notes: null,
      // ❌ REMOVE: attendance: { connect: { id: attendanceId } }
    }
  });

  await BillingService.generateBillFromAttendance(attendanceId);

  return attendance;
};



// ✅ FIXED: Ensure medication is properly added to bill
export const addMedicationToAttendance = [
  body('stockItemId').notEmpty().withMessage('Stock item ID is required'),
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required for pricing'),
  body('dosage').notEmpty().withMessage('Dosage is required'),
  body('frequency').notEmpty().withMessage('Frequency is required'),
  body('duration').notEmpty().withMessage('Duration is required'),
  
  async (req: Request, res: Response) => {
    try {
      console.log('💊 PRESCRIBE MEDICATION - Request received');
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        stockItemId, 
        serviceCatalogId, 
        dosage, 
        frequency, 
        duration, 
        route, 
        instructions, 
        notes 
      } = req.body;
      
      const user = (req as any).user;
      const attendanceId = req.params.id;

      // Validate attendance allows service addition
      await validateAttendanceAllowsServiceAddition(attendanceId);

      // Get stock item
      const stockItem = await prisma.stockItem.findUnique({
        where: { id: stockItemId }
      });

      if (!stockItem) {
        return res.status(404).json({ message: 'Stock item not found' });
      }

      // Get service catalog for pricing
      const serviceCatalog = await prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId },
        include: { pricing: true }
      });

      if (!serviceCatalog) {
        return res.status(404).json({ message: 'Service catalog item not found' });
      }

      if (serviceCatalog.serviceType !== 'medication') {
        return res.status(400).json({ message: 'Service is not a medication type' });
      }

      const outOfStock = stockItem.currentStock === 0;
      
      if (outOfStock) {
        console.warn(`⚠️ Out of stock: ${stockItem.name} has 0 units`);
      }

      // ✅ Create medication record
      const medication = await prisma.medication.create({
        data: {
          attendanceId: attendanceId,
          stockItemId: stockItemId,
          serviceCatalogId: serviceCatalogId,
          name: stockItem.name,
          dosage: dosage,
          frequency: frequency,
          duration: duration,
          quantity: 0, // Quantity will be set at dispensing
          route: route || 'Oral',
          instructions: instructions || '',
          status: 'prescribed',
          prescribedAt: new Date(),
          prescribedById: user.id,
          notes: outOfStock 
            ? `⚠️ OUT OF STOCK: Item has 0 units available. Cannot dispense until restocked. ${notes || ''}` 
            : notes || null,
        }
      });

      // ✅ CRITICAL: Add service to ServiceRendered for billing
      await addServiceToAttendanceAndBill(attendanceId, serviceCatalogId, user.id, 1);

      // ✅ Ensure bill is generated with medication cost
      await BillingService.generateBillFromAttendance(attendanceId);

      // Fetch updated attendance with all data
      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          Medication: {
            include: {
              ServiceCatalog: {
                include: { pricing: true }
              },
              StockItem: true
            }
          },
          ServiceRendered: {
            include: {
              ServiceCatalog: {
                include: { pricing: true }
              }
            }
          },
          Bill: {
            include: {
              BillLineItem: {
                where: { isVoided: false }
              }
            }
          }
        }
      });
      
      const response: any = updatedAttendance;
      if (outOfStock) {
        response.stockWarning = `OUT OF STOCK: ${stockItem.name} has 0 units available. Prescription recorded but cannot be dispensed until restocked.`;
      }
      
      console.log('✅ Medication prescribed and added to bill successfully');
      res.json(response);
    } catch (error) {
      console.error('❌ Error adding medication:', error);
      res.status(500).json({ message: 'Error adding medication', error: (error as Error).message });
    }
  }
];

// attendanceController.ts - FIXED dispenseMedication
export const dispenseMedication = [
  body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required for dispensing'),
  body('dispensedBy').optional().isString(),
  body('batchNumber').optional().isString(),
  
  async (req: Request, res: Response) => {
    try {
      const { attendanceId, medicationId } = req.params;
      const { quantity, dispensedBy, batchNumber, status } = req.body;
      const user = (req as any).user;

      // Get the medication with stock item
      const medication = await prisma.medication.findUnique({
        where: { id: medicationId },
        include: { 
          StockItem: true,
          prescribedBy: { select: { fullName: true } }
        }
      });

      if (!medication) {
        return res.status(404).json({ message: 'Medication not found' });
      }

      if (medication.status !== 'prescribed' && status !== 'dispensed') {
        return res.status(400).json({ message: 'Medication is not in prescribed state' });
      }

      const stockItem = medication.StockItem;
      const dispenseQuantity = parseInt(quantity);
      
      // ✅ BLOCK dispensing when stock is insufficient
      if (!stockItem) {
        return res.status(400).json({ 
          message: 'Cannot dispense: Stock item not found for this medication',
          canPrescribe: true,
          canDispense: false
        });
      }
      
      if (stockItem.currentStock < dispenseQuantity) {
        return res.status(400).json({ 
          message: `Cannot dispense: Insufficient stock. Available: ${stockItem.currentStock}, Required: ${dispenseQuantity}`,
          stockAvailable: stockItem.currentStock,
          required: dispenseQuantity,
          canPrescribe: true,
          canDispense: false
        });
      }

      if (stockItem.currentStock === 0) {
        return res.status(400).json({ 
          message: `Cannot dispense: ${stockItem.name} is out of stock. Please restock first.`,
          stockAvailable: 0,
          required: dispenseQuantity,
          canPrescribe: true,
          canDispense: false
        });
      }

      // ✅ Start a transaction to ensure all updates happen together
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update stock (decrease by dispensed quantity)
        const updatedStock = await tx.stockItem.update({
          where: { id: stockItem.id },
          data: {
            currentStock: stockItem.currentStock - dispenseQuantity
          }
        });

        // 2. Update medication with dispensed quantity
        const updatedMedication = await tx.medication.update({
          where: { id: medicationId },
          data: {
            status: 'dispensed',
            quantity: dispenseQuantity, // ✅ Store the ACTUAL dispensed quantity
            dispensedAt: new Date(),
            dispensedById: dispensedBy || user.id,
            dispensedBatchNumber: batchNumber || null,
            dispensedUnitCost: stockItem.costPrice
          },
          include: {
            StockItem: {
              select: {
                id: true,
                name: true,
                currentStock: true,
                unitOfMeasure: true
              }
            },
            prescribedBy: {
              select: { fullName: true, id: true }
            },
            dispensedBy: {
              select: { fullName: true, id: true }
            }
          }
        });

        // 3. Create stock transaction record
        await tx.stockTransaction.create({
          data: {
            stockItemId: stockItem.id,
            transactionType: 'sale',
            quantity: dispenseQuantity,
            balanceAfter: updatedStock.currentStock,
            reference: `Dispensed from attendance ${attendanceId}`,
            performedBy: user.id,
            notes: `Medication: ${medication.name}, Prescribed quantity: ${medication.quantity}, Dispensed: ${dispenseQuantity}`
          }
        });

        return updatedMedication;
      });

      // ✅ Return the updated medication (not the whole attendance)
      res.json({
        success: true,
        message: `${dispenseQuantity} unit(s) of ${medication.name} dispensed successfully`,
        data: result,
        stockRemaining: result.StockItem?.currentStock
      });
      
    } catch (error) {
      console.error('Error dispensing medication:', error);
      res.status(500).json({ 
        message: 'Error dispensing medication', 
        error: (error as Error).message 
      });
    }
  }
];

export const addScanToAttendance = [
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceCatalogId, priority, notes } = req.body;
      const user = (req as any).user;
      const attendanceId = req.params.id;
      
      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId }
      });

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      if (service.serviceType !== 'scan') {
        return res.status(400).json({ message: 'Service is not a scan type' });
      }

      // Find the scan template
      const scanTemplate = await prisma.scanTemplate.findFirst({
        where: { id: service.scanTemplateId || undefined }
      });

      if (!scanTemplate) {
        return res.status(404).json({ message: 'Scan template not found for this service' });
      }

      const scanType = service.metadata?.scanType || scanTemplate.scanType || service.name;

      // ✅ FIXED: Use ONLY scalar fields - NO nested relation
      await prisma.scan.create({
        data: {
          attendanceId: attendanceId,
          templateId: scanTemplate.id,
          serviceCatalogId: serviceCatalogId,
          scanType: scanType,
          description: service.description || scanTemplate.description || `Scan: ${service.name}`,
          bodyPart: scanTemplate.bodyPart || service.subType || null,
          status: 'requested',
          priority: priority || 'routine',
          requestedAt: new Date(),
          createdById: user.id,
          imageUrls: [],
        }
      });

      await addServiceToAttendanceAndBill(attendanceId, serviceCatalogId, user.id);

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          Scan: {
            include: {
              ServiceCatalog: true
            }
          },
          ServiceRendered: {
            include: {
              ServiceCatalog: true
            }
          },
          Bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding scan:', error);
      res.status(500).json({ message: 'Error adding scan', error: (error as Error).message });
    }
  }
];

export const addProcedureToAttendance = [
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'),
  body('scheduledDate').optional().isISO8601().withMessage('Scheduled date must be valid'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceCatalogId, scheduledDate, notes, assistantId } = req.body;
      const user = (req as any).user;
      const attendanceId = req.params.id;
      
      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId }
      });

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      if (service.serviceType !== 'procedure') {
        return res.status(400).json({ message: 'Service is not a procedure type' });
      }

      // Find the procedure template
      const procedureTemplate = await prisma.procedureTemplate.findFirst({
        where: { id: service.procedureTemplateId || undefined }
      });

      if (!procedureTemplate) {
        return res.status(404).json({ message: 'Procedure template not found for this service' });
      }

      // ✅ FIXED: Use ONLY scalar fields - NO nested relation
      await prisma.procedure.create({
        data: {
          attendanceId: attendanceId,
          templateId: procedureTemplate.id,
          serviceCatalogId: serviceCatalogId,
          status: 'scheduled',
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          notes: notes || '',
          assistantId: assistantId || null,
          createdById: user.id,
          // ❌ REMOVE: attendance: { connect: { id: attendanceId } }
        }
      });

      await addServiceToAttendanceAndBill(attendanceId, serviceCatalogId, user.id);

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          Procedure: {
            include: {
              ServiceCatalog: true
            }
          },
          ServiceRendered: {
            include: {
              ServiceCatalog: true
            }
          },
          Bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding procedure:', error);
      res.status(500).json({ message: 'Error adding procedure', error: (error as Error).message });
    }
  }
];


export const addLabTestToAttendance = [
  body('serviceCatalogId').notEmpty().withMessage('Service catalog ID is required'),
  body('priority').optional().isIn(['routine', 'urgent', 'stat']),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceCatalogId, priority, notes } = req.body;
      const user = (req as any).user;
      const attendanceId = req.params.id;
      
      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId }
      });

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      if (service.serviceType !== 'lab_test') {
        return res.status(400).json({ message: 'Service is not a lab test type' });
      }

      // Find the lab test template
      const labTestTemplate = await prisma.labTestTemplate.findFirst({
        where: { id: service.labTestTemplateId || undefined }
      });

      if (!labTestTemplate) {
        return res.status(404).json({ message: 'Lab test template not found for this service' });
      }

      // ✅ FIXED: Use ONLY scalar fields - NO nested relation
      await prisma.labTest.create({
        data: {
          attendanceId: attendanceId,
          templateId: labTestTemplate.id,
          serviceCatalogId: serviceCatalogId,
          status: 'requested',
          priority: priority || 'routine',
          requestedAt: new Date(),
          createdById: user.id,
          notes: notes || '',
          // ❌ REMOVE: attendance: { connect: { id: attendanceId } }
        }
      });

      await addServiceToAttendanceAndBill(attendanceId, serviceCatalogId, user.id);

      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          LabTest: {
            include: {
              ServiceCatalog: true
            }
          },
          ServiceRendered: {
            include: {
              ServiceCatalog: true
            }
          },
          Bill: true
        }
      });
      
      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error adding lab test:', error);
      res.status(500).json({ message: 'Error adding lab test', error: (error as Error).message });
    }
  }
];


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
      prisma.attendance.findMany({
        where,
        include: {
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true,
              dateOfBirth: true,
              gender: true
            }
          },
          User_Attendance_createdByIdToUser: {
            select: {
              fullName: true,
              username: true
            }
          },
          Admission: {
            select: {
              admissionNumber: true,
              status: true,
              admissionType: true
            }
          },
          Bed: {
            select: {
              bedNumber: true
            }
          },
          Ward: {
            select: {
              wardName: true,
              wardType: true
            }
          },
          Bill: {
            select: {
              billNumber: true,
              totalAmount: true,
              status: true
            }
          },
          AttendanceDiagnosis: {
            include: {
              Diagnosis: {
                select: {
                  name: true,
                  icdCode: true
                }
              }
            }
          },
          LabTest: {
            include: {
              ServiceCatalog: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          },
          Procedure: {
            include: {
              ServiceCatalog: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          },
          Medication: {
            include: {
              ServiceCatalog: {
                select: {
                  name: true,
                  code: true
                }
              },
              StockItem: {
                select: {
                  name: true,
                  drugCode: true,
                  strength: true
                }
              }
            }
          },
          ServiceRendered: {
            include: {
              ServiceCatalog: {
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
      prisma.attendance.count({ where })
    ]);

    const attendancesWithFullName = attendances.map(attendance => ({
      ...attendance,
      patient: attendance.Patient ? {
        ...attendance.Patient,
        fullName: `${attendance.Patient.surname} ${attendance.Patient.otherNames}`.trim()
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
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            gender: true,
            dateOfBirth: true
          }
        },
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
        Admission: true,
        Bed: {
          select: {
            bedNumber: true,
            wardId: true
          }
        },
        Ward: {
          select: {
            wardName: true,
            wardType: true
          }
        },
        Bill: true,
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
        Scan: {  // ✅ This must be present
          include: {
            ServiceCatalog: true
          }
        },
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

    const attendanceWithFullName = {
      ...attendance,
      patient: attendance.Patient ? {
        ...attendance.Patient,
        fullName: `${attendance.Patient.surname} ${attendance.Patient.otherNames}`.trim()
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
          include: { InsuranceProvider: true }
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

      // ==============================================
      // PREPARE DATA FOR ATTENDANCE CREATION
      // ==============================================

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

      // Fetch previous attendances for chronic conditions
      const previousAttendances = await prisma.attendance.findMany({
        where: { patientId: req.body.patientId },
        include: {
          AttendanceDiagnosis: {
            include: {
              Diagnosis: true
            }
          },
          Medication: {
            include: {
              StockItem: true
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
        for (const d of lastAttendance.AttendanceDiagnosis) {
          if (d.Diagnosis && isChronicDiagnosis(d.Diagnosis)) {
            chronicDiagnoses.push({
              diagnosisId: d.diagnosisId,
              notes: `Carried forward from previous visit (${lastAttendance.attendanceNumber})`,
              primary: false,
              date: new Date(),
              createdById: user.id
            });
          }
        }

        for (const m of lastAttendance.Medication) {
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

      // Determine categories
      const encounterCategory = determineNHISEncounterType(
        req.body.attendanceType,
        req.body.admissionId
      );

      const patientAge = calculateAgeAtAttendance(patient.dateOfBirth, new Date());
      const gdrgCategory = determineGDRGCategory(req.body.attendanceType, patientAge);
      const serviceCategory = determineServiceCategory(req.body.attendanceType);

      // Generate attendance number
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

      // ==============================================
      // STEP 1: CREATE ATTENDANCE FIRST
      // ==============================================
      
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
          gdrgCategory,
          serviceCategory: serviceCategory as any,
          referringFacility: req.body.referringFacility,
          createdById: user.id,
          medicalNotes: req.body.complaints || 'No complaints recorded',
          AttendanceDiagnosis: chronicDiagnoses.length > 0 ? {
            create: chronicDiagnoses
          } : undefined,
          Medication: ongoingMedications.length > 0 ? {
            create: ongoingMedications
          } : undefined
        },
        include: {
          Patient: true,
          InsuranceProvider: true
        }
      });

      console.log(`✅ Attendance created: ${attendance.attendanceNumber}`);

      // ==============================================
      // STEP 2: AUTO-BOOKING LOGIC (using the created attendance)
      // ==============================================
      
      const attendanceType = req.body.attendanceType;
      let antenatalBookingId: string | undefined;
      let isFirstAntenatalVisit = false;
      let existingBooking: any = null;

      // 🔵 HANDLE ANTENATAL VISIT
      if (attendanceType === 'antenatal') {
        // Check for existing ACTIVE booking
        existingBooking = await prisma.antenatalBooking.findFirst({
          where: {
            patientId: patient.id,
            isActive: true,
            isCompleted: false
          }
        });

        if (!existingBooking) {
          // FIRST VISIT - Create new booking with attendance connection
          isFirstAntenatalVisit = true;
          
          const pregnancyCount = await prisma.antenatalBooking.count({
            where: { patientId: patient.id }
          });

          // Calculate EDD from LMP if provided
          let edd: Date | undefined;
          let lmp: Date | undefined;
          let gestationalAgeWeeks: number | undefined;
          
          if (req.body.lmp) {
            lmp = new Date(req.body.lmp);
            edd = new Date(lmp);
            edd.setDate(edd.getDate() + 280);
            
            const diffTime = new Date().getTime() - lmp.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            gestationalAgeWeeks = Math.floor(diffDays / 7);
          } else if (req.body.gestationalAgeWeeks) {
            gestationalAgeWeeks = parseInt(req.body.gestationalAgeWeeks);
            // Estimate EDD from gestational age
            edd = new Date();
            edd.setDate(edd.getDate() + (280 - (gestationalAgeWeeks * 7)));
          }

          // ✅ Create booking with attendance connection (attendance already exists)
          const newBooking = await prisma.antenatalBooking.create({
            data: {
              patient: { connect: { id: patient.id } },
              attendance: { connect: { id: attendance.id } },
              createdBy: { connect: { id: user.id } },
              pregnancyNumber: pregnancyCount + 1,
              bookingDate: new Date(),
              lmp: lmp,
              edd: edd,
              gestationalAgeWeeks: gestationalAgeWeeks,
              gravida: req.body.gravida || 1,
              para: req.body.para || 0,
              hbBooking: req.body.hbBooking ? parseFloat(req.body.hbBooking) : undefined,
              riskLevel: 'low',
              isActive: true,
              isCompleted: false,
              iptpDoses: [],
              ttDoses: []
            }
          });
          
          antenatalBookingId = newBooking.id;
          existingBooking = newBooking;
          
          console.log(`✅ Auto-created ANTENATAL booking for patient ${patient.folderNumber} (Visit #1)`);
        } else {
          // SUBSEQUENT VISIT - Use existing booking
          antenatalBookingId = existingBooking.id;
          console.log(`🔄 Using existing ANTENATAL booking for patient ${patient.folderNumber} (Follow-up visit)`);
        }
      }

      // 🟢 HANDLE DELIVERY VISIT
      if (attendanceType === 'delivery') {
        // Find active antenatal booking
        existingBooking = await prisma.antenatalBooking.findFirst({
          where: {
            patientId: patient.id,
            isActive: true,
            isCompleted: false
          }
        });

        if (!existingBooking) {
          // No active booking - create one for this delivery with attendance connection
          const pregnancyCount = await prisma.antenatalBooking.count({
            where: { patientId: patient.id }
          });
          
          const newBooking = await prisma.antenatalBooking.create({
            data: {
              patient: { connect: { id: patient.id } },
              attendance: { connect: { id: attendance.id } },
              createdBy: { connect: { id: user.id } },
              pregnancyNumber: pregnancyCount + 1,
              bookingDate: new Date(),
              edd: new Date(),
              gestationalAgeWeeks: req.body.gestationalAgeWeeks ? parseInt(req.body.gestationalAgeWeeks) : 40,
              gravida: req.body.gravida || 1,
              para: req.body.para || 0,
              riskLevel: 'low',
              isActive: false,
              isCompleted: true,
              deliveryDate: new Date(),
              deliveryOutcome: 'delivered',
              iptpDoses: [],
              ttDoses: []
            }
          });
          
          antenatalBookingId = newBooking.id;
          existingBooking = newBooking;
          console.log(`✅ Created booking for delivery (no prior ANC)`);
        } else {
          antenatalBookingId = existingBooking.id;
          console.log(`✅ Delivery linked to existing antenatal booking ${existingBooking.id}`);
        }

        // Create delivery record
        await prisma.deliveryRecord.create({
          data: {
            patientId: patient.id,
            attendanceId: attendance.id,
            antenatalBookingId: antenatalBookingId,
            deliveryDate: new Date(),
            deliveryType: req.body.deliveryType || 'spontaneous_vertex',
            deliveryOutcome: req.body.deliveryOutcome || 'live_birth',
            placeOfDelivery: 'hospital',
            attendant: user.username || 'System',
            birthWeight: req.body.birthWeight ? parseFloat(req.body.birthWeight) : undefined,
            gestationWeeks: req.body.gestationalAgeWeeks ? parseInt(req.body.gestationalAgeWeeks) : 40,
            createdById: user.id,
            numberOfBabies: 1,
            liveBirths: req.body.deliveryOutcome === 'live_birth' ? 1 : 0,
            stillbirths: req.body.deliveryOutcome?.includes('stillbirth') ? 1 : 0,
            neonatalDeaths: req.body.deliveryOutcome === 'neonatal_death' ? 1 : 0,
            maternalOutcome: 'alive',
            maternalComplications: [],
            resusCitationDone: false,
            episiotomy: false,
            perinealTears: false,
            retainedPlacenta: false,
            postpartumHaemorrhage: false,
            familyPlanningDiscussed: false
          }
        });
        
        // Close the booking
        await prisma.antenatalBooking.update({
          where: { id: existingBooking.id },
          data: {
            isActive: false,
            isCompleted: true,
            deliveryDate: new Date(),
            deliveryOutcome: req.body.deliveryOutcome || 'delivered'
          }
        });
        
        console.log(`✅ Created delivery record for booking ${existingBooking.id}`);
      }

      // 🟡 HANDLE POSTNATAL VISIT
      if (attendanceType === 'postnatal') {
        // Find the most recent completed antenatal booking (delivered)
        existingBooking = await prisma.antenatalBooking.findFirst({
          where: {
            patientId: patient.id,
            isCompleted: true,
            deliveryDate: { not: null }
          },
          orderBy: { deliveryDate: 'desc' }
        });

        if (existingBooking) {
          antenatalBookingId = existingBooking.id;
          console.log(`✅ Postnatal visit linked to delivery from ${existingBooking.deliveryDate}`);
        } else {
          console.log(`⚠️ No delivery record found for postnatal visit`);
        }
      }

      // ==============================================
      // STEP 3: CREATE ANC VISIT RECORD (for antenatal attendances only)
      // ==============================================
      
      if (attendanceType === 'antenatal' && existingBooking) {
        const visitCount = await prisma.aNCVisit.count({
          where: { bookingId: existingBooking.id }
        });
        const nextVisitNumber = visitCount + 1;
        
        await prisma.aNCVisit.create({
          data: {
            bookingId: existingBooking.id,
            attendanceId: attendance.id,
            visitNumber: nextVisitNumber,
            visitDate: attendance.dateTime,
            gestationalAgeWeeks: req.body.gestationalAgeWeeks ? parseInt(req.body.gestationalAgeWeeks) : undefined,
            weight: req.body.weight ? parseFloat(req.body.weight) : undefined,
            bloodPressure: req.body.bloodPressure,
            fundalHeight: req.body.fundalHeight ? parseFloat(req.body.fundalHeight) : undefined,
            fetalHeartRate: req.body.fetalHeartRate ? parseInt(req.body.fetalHeartRate) : undefined,
            recordedById: user.id
          }
        });
        
        console.log(`✅ Created ANC Visit #${nextVisitNumber} for booking ${existingBooking.id}`);
      }

      // ==============================================
      // STEP 4: ADD DEFAULT CONSULTATION SERVICE
      // ==============================================
      
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
              serviceItemId: service.id,
              quantity: 1,
              date: new Date(),
              performedById: user.id
            }
          });
        }
      }

      // ==============================================
      // STEP 5: CREATE BILL
      // ==============================================
      
      const billNumber = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      await prisma.bill.create({
        data: {
          billNumber,
          patientId: req.body.patientId,
          attendanceId: attendance.id,
          billDate: new Date(),
          totalAmount: 0,
          status: 'draft',
          paymentMode: req.body.paymentMode,
          createdById: user.id
        }
      });

      // Generate initial bill
      await BillingService.generateBillFromAttendance(attendance.id);

// ==============================================
// STEP 6: FETCH FULLY POPULATED ATTENDANCE
// ==============================================

const populatedAttendance = await prisma.attendance.findUnique({
  where: { id: attendance.id },
  include: {
    Patient: {
      include: {
        InsuranceProvider: true
      }
    },
    User_Attendance_createdByIdToUser: {
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true
      }
    },
    User_Attendance_updatedByIdToUser: {
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true
      }
    },
    Admission: true,
    Bill: true,
    ServiceRendered: {
      include: {
        ServiceCatalog: true
      }
    },
    AttendanceDiagnosis: {
      include: {
        Diagnosis: true
      }
    },
    LabTest: {
      include: {
        ServiceCatalog: true
      }
    },
    Medication: {
      include: {
        ServiceCatalog: true,
        StockItem: true
      }
    },
    Procedure: {
      include: {
        ServiceCatalog: true
      }
    },
    Scan: {
      include: {
        ServiceCatalog: true
      }
    },
    Vitals: {
      orderBy: { recordedAt: 'desc' },
      take: 5
    },
    InsuranceProvider: true,
    Ward: true,
    Bed: true
  }
});

// Fetch ANC visits separately if needed
let antenatalVisits = [];
if (attendanceType === 'antenatal' && existingBooking) {
  antenatalVisits = await prisma.aNCVisit.findMany({
    where: { attendanceId: attendance.id },
    include: {
      booking: {
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          }
        }
      },
      recordedBy: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      }
    }
  });
}

// ==============================================
// STEP 7: RESPONSE
// ==============================================

const responseData: any = {
  message: 'Attendance created successfully',
  attendance: populatedAttendance,
  categories: {
    encounterCategory,
    visitCategory: mapToNHISVisitCategory(req.body.attendanceType),
    gdrgCategory,
    serviceCategory
  }
};

if (attendanceType === 'antenatal' && existingBooking) {
  responseData.antenatal = {
    bookingId: existingBooking.id,
    isFirstVisit: isFirstAntenatalVisit,
    visitNumber: existingBooking ? await prisma.aNCVisit.count({ where: { bookingId: existingBooking.id } }) + 1 : 1
  };
}

if (attendanceType === 'delivery' && existingBooking) {
  responseData.delivery = {
    bookingId: existingBooking.id,
    deliveryRecorded: true
  };
}

res.status(201).json(responseData);
} catch (error) { 
  console.error('Error creating attendance:', error);
  res.status(500).json({ 
    message: 'Error creating attendance', 
    error: (error as Error).message 
  });
}
} 
];  

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
          Patient: true,
          Bill: true
        }
      });

      res.json(attendance);
    } catch (error) {
      console.error('Error updating attendance status:', error);
      res.status(500).json({ message: 'Error updating attendance status', error });
    }
  }
];

// attendanceController.ts - IMPROVED VERSION
export const addDiagnosisToAttendance = [
  body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
  body('diagnosisType').optional().isIn(['provisional', 'primary', 'additional']).withMessage('Valid diagnosis type required'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { diagnosisId, notes, primary, diagnosisType } = req.body;
      const user = (req as any).user;
      
      // Determine the final diagnosis type
      const finalDiagnosisType = diagnosisType || (primary ? 'primary' : 'provisional');

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

      // ✅ If this is a primary diagnosis, convert any existing primary to additional
      if (finalDiagnosisType === 'primary') {
        await prisma.attendanceDiagnosis.updateMany({
          where: {
            attendanceId: req.params.id,
            diagnosisType: 'primary'
          },
          data: { 
            primary: false, 
            diagnosisType: 'additional'  // Convert previous primary to additional
          }
        });
      }

      // ✅ Create diagnosis with type
      const newDiagnosis = await prisma.attendanceDiagnosis.create({
        data: {
          attendanceId: req.params.id,
          diagnosisId,
          notes: notes || '',
          primary: finalDiagnosisType === 'primary',
          diagnosisType: finalDiagnosisType,
          date: new Date(),
          createdById: user.id,
          icdCode: diagnosis.icdCode
        }
      });

      const updated = await prisma.attendance.findUnique({
        where: { id: req.params.id },
        include: {
          AttendanceDiagnosis: {
            include: {
              Diagnosis: true
            }
          },
          Bill: true
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
        AttendanceDiagnosis: {
          include: {
            Diagnosis: true
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

export const updateMedicationStatus = [
  body('status').isIn(['prescribed', 'dispensed', 'administered', 'cancelled'])
    .withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id: attendanceId, medicationId } = req.params;
      const { 
        status, 
        dispensedAt, 
        dispensedById, 
        administeredAt, 
        administeredById,
        quantity,
        dispensedUnitCost,
        batchNumber,
        doseNumber,
        administeredDoses  // ✅ New field for multiple doses
      } = req.body;
      
      const user = (req as any).user;
      
      // Get the medication with stock item
      const medication = await prisma.medication.findUnique({
        where: { id: medicationId },
        include: { 
          StockItem: true
        }
      });

      if (!medication) {
        return res.status(404).json({ message: 'Medication not found' });
      }

      const updateData: any = { status };
      
      // Handle dispense logic with stock deduction
      if (status === 'dispensed') {
        const dispenseQuantity = quantity || medication.quantity || 1;
        
        if (!medication.StockItem) {
          return res.status(400).json({ 
            message: 'Cannot dispense: Stock item not found for this medication',
            success: false
          });
        }
        
        if (medication.StockItem.currentStock < dispenseQuantity) {
          return res.status(400).json({ 
            message: `Cannot dispense: Insufficient stock. Available: ${medication.StockItem.currentStock}, Required: ${dispenseQuantity}`,
            stockAvailable: medication.StockItem.currentStock,
            required: dispenseQuantity,
            success: false
          });
        }

        // Update stock
        await prisma.stockItem.update({
          where: { id: medication.StockItem.id },
          data: {
            currentStock: {
              decrement: dispenseQuantity
            }
          }
        });

        // Create stock transaction
        await prisma.stockTransaction.create({
          data: {
            stockItemId: medication.StockItem.id,
            transactionType: 'sale',
            quantity: dispenseQuantity,
            balanceAfter: medication.StockItem.currentStock - dispenseQuantity,
            reference: `Dispensed from attendance ${attendanceId}`,
            performedBy: user.id,
            notes: `Medication: ${medication.name}, Dispensed: ${dispenseQuantity}`
          }
        });

        updateData.quantity = dispenseQuantity;
        updateData.dispensedAt = dispensedAt ? new Date(dispensedAt) : new Date();
        updateData.dispensedById = dispensedById || user.id;
        updateData.dispensedUnitCost = dispensedUnitCost || medication.StockItem.costPrice;
        if (batchNumber) updateData.dispensedBatchNumber = batchNumber;
      }
      
      if (status === 'administered') {
        updateData.administeredAt = administeredAt ? new Date(administeredAt) : new Date();
        updateData.administeredById = administeredById || user.id;
        
        // ✅ Handle multiple dose tracking
        if (administeredDoses) {
          updateData.administeredDoses = administeredDoses;
        } else if (doseNumber) {
          // If single dose tracking, build the array
          const existingDoses = (medication.administeredDoses as any[]) || [];
          const updatedDoses = [...existingDoses, {
            doseNumber: doseNumber,
            administeredAt: updateData.administeredAt,
            administeredBy: updateData.administeredById || user?.fullName || user?.username
          }];
          updateData.administeredDoses = updatedDoses;
        }
      }

      // ✅ Update medication
      const updatedMedication = await prisma.medication.update({
        where: { id: medicationId },
        data: updateData,
        include: {
          StockItem: {
            select: {
              id: true,
              name: true,
              currentStock: true,
              unitOfMeasure: true,
              costPrice: true
            }
          },
          User_Medication_prescribedByIdToUser: {
            select: { fullName: true, id: true }
          },
          User_Medication_dispensedByIdToUser: {
            select: { fullName: true, id: true }
          },
          User_Medication_administeredByIdToUser: {
            select: { fullName: true, id: true }
          },
          ServiceCatalog: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });

      // Transform to a cleaner response
      const responseData = {
        ...updatedMedication,
        prescribedBy: updatedMedication.User_Medication_prescribedByIdToUser,
        dispensedBy: updatedMedication.User_Medication_dispensedByIdToUser,
        administeredBy: updatedMedication.User_Medication_administeredByIdToUser,
      };
      
      // Remove the nested relation objects
      delete responseData.User_Medication_prescribedByIdToUser;
      delete responseData.User_Medication_dispensedByIdToUser;
      delete responseData.User_Medication_administeredByIdToUser;

      return res.status(200).json({
        success: true,
        message: status === 'dispensed' 
          ? `${updatedMedication.quantity} unit(s) of ${updatedMedication.name} dispensed successfully`
          : `Medication status updated to ${status}`,
        data: responseData
      });
      
    } catch (error) {
      console.error('Error updating medication:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Error updating medication', 
        error: (error as Error).message 
      });
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
  body('status').isIn(['requested', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'), // ✅ Added 'in_progress'
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id: attendanceId, labTestId } = req.params;
      const { status, result, normalRange, units, performedById, verifiedById, notes, completedAt } = req.body;
      
      const updateData: any = { status };
      if (result !== undefined) updateData.result = result;
      if (normalRange) updateData.normalRange = normalRange;
      if (units) updateData.units = units;
      if (performedById) updateData.performedById = performedById;
      if (verifiedById) updateData.verifiedById = verifiedById;
      if (notes) updateData.notes = notes;
      if (status === 'completed' || completedAt) {
        updateData.completedAt = completedAt ? new Date(completedAt) : new Date();
      }

      await prisma.labTest.update({
        where: { id: labTestId },
        data: updateData
      });

      // ✅ FIXED: Use correct relation names from schema
      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          LabTest: {
            include: {
              ServiceCatalog: true,  // ✅ Capital S, Capital C
              User_LabTest_performedByIdToUser: {  // ✅ Correct relation name from schema
                select: {
                  id: true,
                  fullName: true,
                  username: true
                }
              },
              User_LabTest_verifiedByIdToUser: {  // ✅ Correct relation name from schema
                select: {
                  id: true,
                  fullName: true,
                  username: true
                }
              },
              Attendance: {  // ✅ Include attendance for context
                select: {
                  attendanceNumber: true,
                  patientId: true
                }
              }
            }
          },
          Bill: true,
          ServiceRendered: {
            include: {
              ServiceCatalog: true
            }
          }
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating lab test:', error);
      res.status(500).json({ message: 'Error updating lab test', error: (error as Error).message });
    }
  }
];

// attendanceController.ts - FIXED removeLabTestFromAttendance
export const removeLabTestFromAttendance = async (req: Request, res: Response) => {
  try {
    const { id: attendanceId, labTestId } = req.params;

    // ✅ First check if lab test exists
    const labTest = await prisma.labTest.findUnique({
      where: { id: labTestId },
      select: { serviceCatalogId: true }
    });

    if (!labTest) {
      return res.status(404).json({ message: 'Lab test not found' });
    }

    // ✅ Delete the lab test
    await prisma.labTest.delete({
      where: { id: labTestId }
    });

    // ✅ Remove the associated service if exists
    if (labTest.serviceCatalogId) {
      const serviceRendered = await prisma.serviceRendered.findFirst({
        where: {
          attendanceId: attendanceId,
          serviceItemId: labTest.serviceCatalogId
        }
      });

      if (serviceRendered) {
        await prisma.serviceRendered.delete({
          where: { id: serviceRendered.id }
        });

        // Regenerate bill
        await BillingService.generateBillFromAttendance(attendanceId);
      }
    }

    // ✅ Return updated attendance with correct include
    const updatedAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        LabTest: {
          include: {
            ServiceCatalog: true  // ✅ Capital S, Capital C
          }
        },
        ServiceRendered: {
          include: {
            ServiceCatalog: true
          }
        },
        Bill: true
      }
    });

    res.json(updatedAttendance);
  } catch (error) {
    console.error('Error removing lab test:', error);
    res.status(500).json({ message: 'Error removing lab test', error: (error as Error).message });
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
          Procedure: {
            include: {
              ServiceCatalog: true // ✅ UPDATED
            }
          },
          Bill: true
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating procedure:', error);
      res.status(500).json({ message: 'Error updating procedure', error });
    }
  }
];

// attendanceController.ts - FIXED removeProcedureFromAttendance
export const removeProcedureFromAttendance = async (req: Request, res: Response) => {
  try {
    const { id: attendanceId, procedureId } = req.params;

    // ✅ First check if procedure exists
    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      select: { serviceCatalogId: true }
    });

    if (!procedure) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    // ✅ Delete the procedure
    await prisma.procedure.delete({
      where: { id: procedureId }
    });

    // ✅ Remove the associated service if exists (using correct field name: serviceItemId)
    if (procedure.serviceCatalogId) {
      const serviceRendered = await prisma.serviceRendered.findFirst({
        where: {
          attendanceId: attendanceId,
          serviceItemId: procedure.serviceCatalogId // ✅ Fixed: serviceItemId, NOT serviceCatalogId
        }
      });

      if (serviceRendered) {
        await prisma.serviceRendered.delete({
          where: { id: serviceRendered.id }
        });

        // Regenerate bill
        await BillingService.generateBillFromAttendance(attendanceId);
      }
    }

    // ✅ Return updated attendance
    const updatedAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Procedure: {
          include: {
            ServiceCatalog: true
          }
        },
        ServiceRendered: {
          include: {
            ServiceCatalog: true
          }
        },
        Bill: true
      }
    });

    res.json(updatedAttendance);
  } catch (error) {
    console.error('Error removing procedure:', error);
    res.status(500).json({ message: 'Error removing procedure', error: (error as Error).message });
  }
};

// ✅ UPDATE SCAN STATUS - COMPLETE FIX
export const updateScanStatus = [
  body('status').isIn(['requested', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id: attendanceId, scanId } = req.params;
      const { status, result, findings, impression, performedById, imageUrls, completedAt } = req.body;
      
      const updateData: any = { 
        status: status  // ✅ Set status to 'completed'
      };
      
      if (result !== undefined) updateData.result = result;
      if (findings !== undefined) updateData.findings = findings;
      if (impression !== undefined) updateData.impression = impression;
      if (performedById) updateData.performedById = performedById;
      if (imageUrls) updateData.imageUrls = imageUrls;
      
      // ✅ Set completedAt when status is completed
      if (status === 'completed') {
        updateData.completedAt = completedAt ? new Date(completedAt) : new Date();
      }

      console.log('🔄 Updating scan:', { scanId, updateData }); // Debug log

      // ✅ Update the scan
      const updatedScan = await prisma.scan.update({
        where: { id: scanId },
        data: updateData
      });

      console.log('✅ Scan updated:', { id: updatedScan.id, status: updatedScan.status });

      // ✅ Fetch the full updated attendance
      const updatedAttendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          Scan: {
            include: {
              ServiceCatalog: true
            }
          },
          Bill: true,
          ServiceRendered: {
            include: {
              ServiceCatalog: true
            }
          }
        }
      });

      res.json(updatedAttendance);
    } catch (error) {
      console.error('Error updating scan:', error);
      res.status(500).json({ message: 'Error updating scan', error: (error as Error).message });
    }
  }
];

// attendanceController.ts - FIXED removeScanFromAttendance
export const removeScanFromAttendance = async (req: Request, res: Response) => {
  try {
    const { id: attendanceId, scanId } = req.params;

    // ✅ First check if scan exists
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      select: { serviceCatalogId: true }
    });

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    // ✅ Delete the scan
    await prisma.scan.delete({
      where: { id: scanId }
    });

    // ✅ Remove the associated service if exists (using correct field name: serviceItemId)
    if (scan.serviceCatalogId) {
      const serviceRendered = await prisma.serviceRendered.findFirst({
        where: {
          attendanceId: attendanceId,
          serviceItemId: scan.serviceCatalogId // ✅ Fixed: serviceItemId
        }
      });

      if (serviceRendered) {
        await prisma.serviceRendered.delete({
          where: { id: serviceRendered.id }
        });

        // Regenerate bill
        await BillingService.generateBillFromAttendance(attendanceId);
      }
    }

    // ✅ Return updated attendance
    const updatedAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Scan: {
          include: {
            ServiceCatalog: true
          }
        },
        ServiceRendered: {
          include: {
            ServiceCatalog: true
          }
        },
        Bill: true
      }
    });

    res.json(updatedAttendance);
  } catch (error) {
    console.error('Error removing scan:', error);
    res.status(500).json({ message: 'Error removing scan', error: (error as Error).message });
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
        User: {
          select: {
            fullName: true,
            role: true
          }
        }
        ,
        Patient: {
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
          User: {
            select: {
              fullName: true,
              role: true
            }
          },
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true
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
      await validateAttendanceAllowsServiceAddition(req.params.id);
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
          ServiceRendered: {
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
    const { id } = req.params;
    
    const billResult = await BillingService.generateBillFromAttendance(id);
    
    res.json({
      success: true,
      message: 'Bill calculated successfully',
      totalBill: billResult.summary?.totalCashPrice || billResult.totalAmount || 0,
      bill: billResult.bill || billResult,
      summary: billResult.summary || {
        totalCashPrice: billResult.totalAmount || 0,
        totalNHISPrice: 0,
        totalInsurancePrice: 0
      }
    });
  } catch (error) {
    console.error('Error calculating bill:', error);
    res.status(500).json({ 
      message: 'Error calculating bill', 
      error: (error as Error).message 
    });
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
        Patient: true,
        Bill: true
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
        Scan: {  // ✅ This must be present
          include: {
            ServiceCatalog: true
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


// ✅ UPLOAD SCAN IMAGES
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for scan images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/scans';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `scan-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

export const uploadScanImages = [
  upload.array('images', 10),
  async (req: Request, res: Response) => {
    try {
      const { scanId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No images uploaded' });
      }

      const imageUrls = files.map(file => `/uploads/scans/${file.filename}`);
      
      // Update the scan with image URLs
      const scan = await prisma.scan.update({
        where: { id: scanId },
        data: {
          imageUrls: {
            push: imageUrls
          }
        }
      });

      res.json({ success: true, imageUrls, scan });
    } catch (error) {
      console.error('Error uploading scan images:', error);
      res.status(500).json({ success: false, message: 'Error uploading images' });
    }
  }
];