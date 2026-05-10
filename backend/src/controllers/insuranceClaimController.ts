// controllers/insuranceClaimController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';
import { NHISClaimService } from '../services/NHISClaimService';
import { NHISXMLGenerator } from '../services/NHISXMLGenerator';

const prisma = new PrismaClient();

// Helper function for safe array mapping
const safeMap = (arr: any[] | undefined, mapper: (item: any) => any): any[] => {
  return (arr || []).map(mapper).filter(Boolean);
};


// Add this function after the imports and before the other functions
export const getAllInsuranceClaims = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      status, 
      insuranceProviderId, 
      patientId, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 50 
    } = req.query;

    const where: any = {};
    
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        const statusArray = status.split(',').map(s => s.trim());
        where.status = { in: statusArray };
      } else {
        where.status = status as string;
      }
    }
    
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId as string;
    if (patientId) where.patientId = patientId as string;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          InsuranceProvider: {
            select: {
              id: true,
              name: true,
              type: true,
              coveragePercentage: true
            }
          },
          Patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true,
              contact: true
            }
          },
          Attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              dateTime: true,
              status: true,
              nhisCCC: true
            }
          },
          Bill: {
            select: {
              id: true,
              billNumber: true,
              totalAmount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.insuranceClaim.count({ where })
    ]);

    res.json({
      success: true,
      data: claims,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching insurance claims:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insurance claims',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// ==========================================
// NHIS CLAIM FUNCTIONS
// ==========================================

// First, add this helper function at the top of the file (if not already there):
const calculateAgeInYears = (dateOfBirth: Date, asOfDate: Date): number => {
  const birthDate = new Date(dateOfBirth);
  const targetDate = new Date(asOfDate);
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = targetDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
};


export const generateNHISClaim = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { attendanceId } = req.body;
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingClaim = await tx.insuranceClaim.findFirst({
          where: { attendanceId, InsuranceProvider: { type: 'nhis' } }
        });
        if (existingClaim) return { claim: existingClaim, isExisting: true };

        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: {
            Patient: true,
            InsuranceProvider: true,
            Bill: true,
            Admission: true,
            AttendanceDiagnosis: {
              where: { diagnosisType: 'primary' },
              include: { Diagnosis: true }
            },
            ServiceRendered: { include: { ServiceCatalog: true } },
            Medication: {
              where: { status: 'dispensed' },
              include: { ServiceCatalog: true, StockItem: true }
            },
            LabTest: {
              where: { status: 'completed' },
              include: { ServiceCatalog: true }
            },
            Scan: {
              where: { status: 'completed' },
              include: { ServiceCatalog: true }
            },
            Procedure: {
              where: { status: 'completed' },
              include: { ServiceCatalog: true }
            }
          }
        });

        if (!attendance) throw new Error('Attendance not found');
        if (!attendance.InsuranceProvider || attendance.InsuranceProvider.type !== 'nhis') {
          throw new Error('Attendance is not for NHIS provider');
        }
        if (!attendance.nhisCCC) throw new Error('NHIS CCC number required');

        const primaryDiagnosis = attendance.AttendanceDiagnosis[0];
        if (!primaryDiagnosis) throw new Error('Primary diagnosis required');

        const gdrgLink = await tx.gDRGTariffDiagnosis.findFirst({
          where: { diagnosisId: primaryDiagnosis.diagnosisId },
          include: { gdrgTariff: true }
        });

        if (!gdrgLink) {
          throw new Error(`No GDRG tariff linked to diagnosis: ${primaryDiagnosis.Diagnosis?.name}`);
        }

        const patientAge = calculateAgeInYears(attendance.Patient.dateOfBirth, attendance.dateTime);
        const isAdult = patientAge >= 12;
        const ageSplit = isAdult ? 'A' : 'C';
        const baseGdrgCode = gdrgLink.gdrgTariff.gdrgCode.slice(0, -1);
        const finalGdrgCode = baseGdrgCode + ageSplit;
        
        const gdrgTariff = await tx.gDRGTariff.findFirst({
          where: { gdrgCode: finalGdrgCode, isActive: true }
        }) || gdrgLink.gdrgTariff;

        const claimNumber = `NHIS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        
        const diagnosisCodes = [primaryDiagnosis.Diagnosis?.icdCode].filter(Boolean);
        const labTestCodes = attendance.LabTest.map(lt => lt.ServiceCatalog?.nhisServiceCode).filter(Boolean);
        const scanCodes = attendance.Scan.map(s => s.ServiceCatalog?.nhisServiceCode).filter(Boolean);
        const procedureCodes = attendance.Procedure.map(p => p.ServiceCatalog?.code).filter(Boolean);
        const medicationCodes = attendance.Medication.map(m => m.StockItem?.drugCode || m.ServiceCatalog?.code).filter(Boolean);
        const serviceCodes = attendance.ServiceRendered.map(s => s.ServiceCatalog?.nhisServiceCode).filter(Boolean);

        const totalClaimAmount = gdrgTariff.nhiaTariff;
        const principalGDRG = gdrgTariff.gdrgCode;
        const claimCheckCode = attendance.nhisCCC;
        const typeOfService = attendance.Admission ? 'IPD' : 'OPD';
        const serviceOutcome = attendance.status === 'completed' ? 'DISC' : 'CONT';
        const mdcCode = principalGDRG.match(/^[A-Z]+/)?.[0] || 'MEDI';

        let typeOfAttendance = 'GEN';
        if (attendance.attendanceType === 'emergency_acute') typeOfAttendance = 'EAE';
        else if (attendance.attendanceType === 'antenatal') typeOfAttendance = 'ANC';
        else if (attendance.attendanceType === 'delivery') typeOfAttendance = 'DEL';
        else if (attendance.attendanceType === 'surgery') typeOfAttendance = 'SUR';

        const datesOfService: string[] = [];
        if (attendance.Admission) {
          let currentDate = new Date(attendance.Admission.admissionDate);
          const dischargeDate = attendance.Admission.dischargeDate || new Date();
          while (currentDate <= dischargeDate) {
            datesOfService.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          datesOfService.push(attendance.dateTime.toISOString().split('T')[0]);
        }

          // ✅ FIXED: Connect both Attendance AND Bill
          const claim = await tx.insuranceClaim.create({
            data: {
              claimNumber,
              billId: attendance.Bill?.id,
              patientId: attendance.patientId,
              attendanceId: attendance.id,
              insuranceProviderId: attendance.insuranceProviderId,
              totalClaimAmount,
              status: 'draft',
              createdById: req.user.id,
              diagnosisCodes,
              labTestCodes,
              procedureCodes,
              medicationCodes,
              serviceCodes,
              gdrgCodes: [principalGDRG],
              // ✅ FIX: Filter out null values
              nhisServiceCodes: gdrgTariff.nhisServiceCode ? [gdrgTariff.nhisServiceCode] : [],
              principalGDRG,
              claimCheckCode,
              typeOfService,
              serviceOutcome,
              mdcCode,
              typeOfAttendance,
              datesOfService,
              scanCodes,
              notes: `NHIS CCC: ${attendance.nhisCCC}, GDRG: ${principalGDRG}`
            }
          });

        await tx.attendance.update({
          where: { id: attendanceId },
          data: { insuranceClaimId: claim.id }
        });

        return { claim, gdrgDetails: gdrgTariff, isExisting: false };
      });

      res.status(201).json({
        success: true,
        message: result.isExisting ? 'NHIS claim already exists' : 'NHIS claim generated',
        data: result.claim
      });
    } catch (error: any) {
      console.error('Error generating NHIS claim:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

export const getNHISClaims = async (req: AuthRequest, res: Response) => {
  try {
    const { status, patientId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const where: any = { InsuranceProvider: { type: 'nhis' } };
    if (status) where.status = status as string;
    if (patientId) where.patientId = patientId as string;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          InsuranceProvider: { select: { id: true, name: true, type: true } },
          Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
          Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, nhisCCC: true } },
          Bill: { select: { id: true, billNumber: true, totalAmount: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.insuranceClaim.count({ where })
    ]);

    res.json({ success: true, data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching NHIS claims' });
  }
};

// ==========================================
// PRIVATE INSURANCE CLAIM FUNCTIONS
// ==========================================

export const generatePrivateInsuranceClaim = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { attendanceId } = req.body;
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingClaim = await tx.insuranceClaim.findFirst({
          where: { attendanceId, InsuranceProvider: { type: 'private' } }
        });
        if (existingClaim) return { claim: existingClaim, isExisting: true };

        const attendance = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: {
            Patient: true,
            InsuranceProvider: true,
            Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } },
            AttendanceDiagnosis: { include: { Diagnosis: true } },
            ServiceRendered: { include: { ServiceCatalog: true } },
            LabTest: { include: { ServiceCatalog: true } },
            Medication: { include: { ServiceCatalog: true } },
            Procedure: { include: { ServiceCatalog: true } },
            Scan: { include: { ServiceCatalog: true } }
          }
        });

        if (!attendance) throw new Error('Attendance not found');
        if (!attendance.InsuranceProvider || attendance.InsuranceProvider.type !== 'private') {
          throw new Error('Attendance is not for private insurance');
        }

        const claimNumber = `PVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const diagnosisCodes = safeMap(attendance.AttendanceDiagnosis, d => d.Diagnosis?.icdCode);
        const procedureCodes = safeMap(attendance.Procedure, p => p.ServiceCatalog?.code);
        const labTestCodes = safeMap(attendance.LabTest, lt => lt.ServiceCatalog?.code);
        const scanCodes = safeMap(attendance.Scan, s => s.ServiceCatalog?.code);
        const serviceCodes = safeMap(attendance.ServiceRendered, s => s.ServiceCatalog?.code);
        const totalClaimAmount = attendance.Bill?.totalAmount || 0;

        const claim = await tx.insuranceClaim.create({
          data: {
            claimNumber,
            billId: attendance.Bill?.id,
            patientId: attendance.patientId,
            attendanceId: attendance.id,
            insuranceProviderId: attendance.insuranceProviderId,
            totalClaimAmount,
            status: 'draft',
            createdById: req.user.id,
            diagnosisCodes,
            procedureCodes,
            labTestCodes,
            scanCodes,
            serviceCodes,
            notes: 'Private insurance claim - itemized billing'
          }
        });

        await tx.attendance.update({
          where: { id: attendanceId },
          data: { insuranceClaimId: claim.id }
        });

        return { claim, isExisting: false };
      });

      res.status(201).json({
        success: true,
        message: result.isExisting ? 'Private claim already exists' : 'Private claim generated',
        data: result.claim
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

export const getPrivateInsuranceClaims = async (req: AuthRequest, res: Response) => {
  try {
    const { status, patientId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const where: any = { InsuranceProvider: { type: 'private' } };
    if (status) where.status = status as string;
    if (patientId) where.patientId = patientId as string;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          InsuranceProvider: { select: { id: true, name: true, type: true } },
          Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
          Attendance: { select: { id: true, attendanceNumber: true, dateTime: true } },
          Bill: { select: { id: true, billNumber: true, totalAmount: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.insuranceClaim.count({ where })
    ]);

    res.json({ success: true, data: claims, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching private claims' });
  }
};

// ==========================================
// COMMON CLAIM FUNCTIONS
// ==========================================

export const getInsuranceClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: {
        InsuranceProvider: true,
        Patient: true,
        Attendance: true,
        Bill: true
      }
    });
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching claim' });
  }
};

export const getClaimByAttendanceId = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const claim = await prisma.insuranceClaim.findFirst({
      where: { attendanceId },
      include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true }
    });
    if (!claim) return res.status(404).json({ success: false, message: 'No claim found for this attendance' });
    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching claim' });
  }
};

export const updateClaimDraft = [
  body('diagnosisCodes').optional().isArray(),
  body('procedureCodes').optional().isArray(),
  body('labTestCodes').optional().isArray(),
  body('scanCodes').optional().isArray(),
  body('serviceCodes').optional().isArray(),
  body('totalClaimAmount').optional().isNumeric(),
  
  async (req: AuthRequest, res: Response) => {
    try {
      const { claimId } = req.params;
      const updateData: any = { updatedById: req.user?.id, updatedAt: new Date() };
      const fields = ['diagnosisCodes', 'procedureCodes', 'labTestCodes', 'scanCodes', 'serviceCodes', 'totalClaimAmount', 'notes', 'preAuthNumber'];
      for (const field of fields) {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      }
      const claim = await prisma.insuranceClaim.update({ where: { id: claimId }, data: updateData });
      res.json({ success: true, message: 'Claim updated', data: claim });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating claim' });
    }
  }
];

export const finalizeClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    const claim = await prisma.insuranceClaim.findUnique({ where: { id: claimId } });
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    if (claim.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft claims can be finalized' });
    
    const finalizedClaim = await prisma.insuranceClaim.update({
      where: { id: claimId },
      data: { status: 'submitted', submissionDate: new Date(), updatedById: req.user?.id }
    });
    res.json({ success: true, message: 'Claim finalized', data: finalizedClaim });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error finalizing claim' });
  }
};

export const updateClaimStatus = [
  body('status').isIn(['draft', 'submitted', 'approved', 'paid', 'rejected']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { claimId } = req.params;
      const { status, notes } = req.body;
      const updateData: any = { status, updatedById: req.user?.id, updatedAt: new Date() };
      if (status === 'submitted') updateData.submissionDate = new Date();
      if (status === 'approved') updateData.approvalDate = new Date();
      if (status === 'paid') updateData.paymentDate = new Date();
      if (notes) updateData.notes = notes;
      
      const claim = await prisma.insuranceClaim.update({ where: { id: claimId }, data: updateData });
      res.json({ success: true, message: `Claim status updated to ${status}`, data: claim });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating status' });
    }
  }
];

export const generateClaimXML = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: { InsuranceProvider: true }
    });

    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    let xml: string;
    if (claim.InsuranceProvider?.type === 'nhis') {
      xml = await NHISXMLGenerator.generateNHISClaimXML(claimId);
    } else {
      // Simple format for private insurance
      const simpleClaim = await prisma.insuranceClaim.findUnique({
        where: { id: claimId },
        include: { Attendance: { include: { Patient: true } }, InsuranceProvider: true }
      });
      xml = `<?xml version="1.0" encoding="UTF-8"?>
<PrivateInsuranceClaim>
  <ClaimNumber>${simpleClaim?.claimNumber}</ClaimNumber>
  <ClaimDate>${new Date().toISOString()}</ClaimDate>
  <PatientName>${simpleClaim?.Attendance?.Patient?.surname || ''} ${simpleClaim?.Attendance?.Patient?.otherNames || ''}</PatientName>
  <Provider>${simpleClaim?.InsuranceProvider?.name || ''}</Provider>
  <TotalAmount>${simpleClaim?.totalClaimAmount || 0}</TotalAmount>
</PrivateInsuranceClaim>`;
    }

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="claim_${claim.claimNumber}.xml"`);
    res.send(xml);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating XML' });
  }
};

export const generateClaimPrint = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: { InsuranceProvider: true, Patient: true, Attendance: true, Bill: true }
    });
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating print' });
  }
};

export const getFinalizedClaimsTotal = async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, type } = req.query;
    const where: any = { status: 'submitted' };
    if (type === 'nhis') where.InsuranceProvider = { type: 'nhis' };
    if (type === 'private') where.InsuranceProvider = { type: 'private' };
    if (dateFrom || dateTo) {
      where.submissionDate = {};
      if (dateFrom) where.submissionDate.gte = new Date(dateFrom as string);
      if (dateTo) where.submissionDate.lte = new Date(dateTo as string);
    }

    const claims = await prisma.insuranceClaim.findMany({
      where,
      include: { InsuranceProvider: true, Patient: true }
    });

    res.json({
      success: true,
      data: {
        total: claims.length,
        totalAmount: claims.reduce((sum, c) => sum + c.totalClaimAmount, 0),
        claims: claims.map(c => ({
          id: c.id,
          claimNumber: c.claimNumber,
          patientName: `${c.Patient?.surname || ''} ${c.Patient?.otherNames || ''}`.trim(),
          amount: c.totalClaimAmount,
          submissionDate: c.submissionDate,
          provider: c.InsuranceProvider?.name
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching totals' });
  }
};

// ==========================================
// DELETE INSURANCE CLAIM
// ==========================================
export const deleteInsuranceClaim = async (req: AuthRequest, res: Response) => {
  try {
    const { claimId } = req.params;
    
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId }
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    // Prevent deletion of finalized/submitted claims
    if (claim.status === 'submitted' || claim.status === 'approved' || claim.status === 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete finalized or submitted claims. Only draft claims can be deleted.' 
      });
    }

    await prisma.insuranceClaim.delete({
      where: { id: claimId }
    });

    res.json({ success: true, message: 'Claim deleted successfully' });
  } catch (error) {
    console.error('Delete claim error:', error);
    res.status(500).json({ success: false, message: 'Error deleting claim' });
  }
};

// ==========================================
// GENERATE BATCH XML
// ==========================================
export const generateBatchXML = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    
    const batch = await prisma.claimBatch.findUnique({
      where: { id: batchId },
      include: { 
        claims: {
          include: {
            InsuranceProvider: true,
            Attendance: { include: { Patient: true } },
            Bill: true
          }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batch.claims.length === 0) {
      return res.status(400).json({ success: false, message: 'Batch has no claims' });
    }

    // Generate NHIS batch XML format
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISBatch>
  <BatchInfo>
    <BatchNumber>${batch.batchNumber}</BatchNumber>
    <BatchDate>${new Date(batch.batchDate).toISOString()}</BatchDate>
    <FacilityCode>${process.env.NHIS_FACILITY_CODE || 'GH001'}</FacilityCode>
    <GeneratedDate>${new Date().toISOString()}</GeneratedDate>
    <TotalClaims>${batch.claims.length}</TotalClaims>
    <TotalAmount>${batch.totalAmount.toFixed(2)}</TotalAmount>
  </BatchInfo>
  <Claims>\n`;

    for (const claim of batch.claims) {
      xml += `    <Claim>
      <ClaimNumber>${claim.claimNumber}</ClaimNumber>
      <PatientName>${claim.Attendance?.Patient?.surname || ''} ${claim.Attendance?.Patient?.otherNames || ''}</PatientName>
      <Provider>${claim.InsuranceProvider?.name || ''}</Provider>
      <Amount>${claim.totalClaimAmount?.toFixed(2) || '0.00'}</Amount>
      <Status>${claim.status}</Status>
    </Claim>\n`;
    }

    xml += `  </Claims>
</NHISBatch>`;

    // Update batch status and XML generation timestamp
    await prisma.claimBatch.update({
      where: { id: batchId },
      data: {
        status: 'generated',
        xmlGeneratedAt: new Date()
      }
    });

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="batch_${batch.batchNumber}.xml"`);
    res.send(xml);
  } catch (error) {
    console.error('Generate batch XML error:', error);
    res.status(500).json({ success: false, message: 'Error generating batch XML' });
  }
};