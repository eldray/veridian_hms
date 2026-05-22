// modules/insuranceClaim/insuranceClaim.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function for safe array mapping
const safeMap = (arr: any[] | undefined, mapper: (item: any) => any): any[] => {
  return (arr || []).map(mapper).filter(Boolean);
};

// Helper function for calculating age
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

// ==========================================
// CLAIM BATCH SERVICES
// ==========================================

export const createClaimBatch = async (
  claimIds: string[],
  description: string | null,
  insuranceType: string | null,
  createdById: string
) => {
  if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
    throw new Error('At least one claim ID is required');
  }

  let targetInsuranceType = insuranceType;
  const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const batch = await prisma.$transaction(async (tx) => {
    // Verify all claims exist and are eligible for batching
    const claims = await tx.insuranceClaim.findMany({
      where: { id: { in: claimIds } },
      include: { InsuranceProvider: true }
    });

    if (claims.length !== claimIds.length) {
      throw new Error('One or more claims not found');
    }

    // Determine insurance type from first claim if not provided
    if (!targetInsuranceType && claims.length > 0) {
      targetInsuranceType = claims[0].InsuranceProvider?.type;
    }

    if (!targetInsuranceType) {
      throw new Error('Insurance type must be specified or determinable from claims');
    }

    // Check that all claims are submitted and for the same insurance provider type
    for (const claim of claims) {
      if (claim.status !== 'submitted') {
        throw new Error(`Claim ${claim.claimNumber} is not in submitted status`);
      }
      if (claim.InsuranceProvider?.type !== targetInsuranceType) {
        throw new Error(`Claim ${claim.claimNumber} does not match the insurance type (${targetInsuranceType})`);
      }
      if (claim.batchId) {
        throw new Error(`Claim ${claim.claimNumber} is already in a batch`);
      }
    }

    // Calculate total amount
    const totalAmount = claims.reduce((sum, c) => sum + c.totalClaimAmount, 0);

    // Create the batch
    const createdBatch = await tx.claimBatch.create({
      data: {
        batchNumber,
        description: description || null,
        totalAmount,
        status: 'draft',
        createdById,
        claims: {
          connect: claimIds.map(id => ({ id }))
        }
      },
      include: {
        claims: {
          include: {
            InsuranceProvider: true,
            Patient: true,
            Attendance: true,
            Bill: true
          }
        },
        createdBy: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });

    // Update claims with batchId
    await tx.insuranceClaim.updateMany({
      where: { id: { in: claimIds } },
      data: { batchId: createdBatch.id }
    });

    return createdBatch;
  });

  return batch;
};

export const getClaimBatches = async (
  status?: string,
  startDate?: Date,
  endDate?: Date,
  page: number = 1,
  limit: number = 50
) => {
  const where: any = {};
  if (status) {
    where.status = status;
  }

  // Add date range filtering
  if (startDate || endDate) {
    where.batchDate = {};
    if (startDate) {
      where.batchDate.gte = startDate;
    }
    if (endDate) {
      // Set to end of day for inclusive filtering
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      where.batchDate.lte = endDateObj;
    }
  }

  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, Math.max(1, limit));
  const skip = (pageNum - 1) * limitNum;

  const [batches, total] = await Promise.all([
    prisma.claimBatch.findMany({
      where,
      include: {
        claims: {
          select: {
            id: true,
            claimNumber: true,
            totalClaimAmount: true,
            status: true,
            Patient: {
              select: {
                id: true,
                folderNumber: true,
                surname: true,
                otherNames: true
              }
            }
          }
        },
        createdBy: {
          select: { id: true, fullName: true, username: true }
        }
      },
      orderBy: { batchDate: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.claimBatch.count({ where })
  ]);

  return {
    data: batches,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

export const getClaimBatch = async (batchId: string) => {
  const batch = await prisma.claimBatch.findUnique({
    where: { id: batchId },
    include: {
      claims: {
        include: {
          InsuranceProvider: true,
          Patient: true,
          Attendance: true,
          Bill: true
        }
      },
      createdBy: {
        select: { id: true, fullName: true, username: true }
      }
    }
  });

  if (!batch) {
    throw new Error('Batch not found');
  }

  return batch;
};

export const addClaimsToBatch = async (
  batchId: string,
  claimIds: string[]
) => {
  if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
    throw new Error('At least one claim ID is required');
  }

  const batch = await prisma.$transaction(async (tx) => {
    const existingBatch = await tx.claimBatch.findUnique({
      where: { id: batchId },
      include: { claims: true }
    });

    if (!existingBatch) {
      throw new Error('Batch not found');
    }

    if (existingBatch.status !== 'draft') {
      throw new Error('Can only add claims to draft batches');
    }

    // Verify claims
    const claims = await tx.insuranceClaim.findMany({
      where: {
        id: { in: claimIds },
        batchId: null // Must not be in any batch
      },
      include: { InsuranceProvider: true }
    });

    if (claims.length !== claimIds.length) {
      throw new Error('One or more claims not found or already in a batch');
    }

    // Check claims are submitted and NHIS
    for (const claim of claims) {
      if (claim.status !== 'submitted') {
        throw new Error(`Claim ${claim.claimNumber} is not in submitted status`);
      }
      if (claim.InsuranceProvider?.type !== 'nhis') {
        throw new Error(`Claim ${claim.claimNumber} is not an NHIS claim`);
      }
    }

    // Calculate additional amount
    const additionalAmount = claims.reduce((sum, c) => sum + c.totalClaimAmount, 0);

    // Add claims to batch
    await tx.claimBatch.update({
      where: { id: batchId },
      data: {
        totalAmount: existingBatch.totalAmount + additionalAmount,
        claims: {
          connect: claimIds.map(id => ({ id }))
        }
      }
    });

    // Update claims with batchId
    await tx.insuranceClaim.updateMany({
      where: { id: { in: claimIds } },
      data: { batchId }
    });

    // Return updated batch
    return await tx.claimBatch.findUnique({
      where: { id: batchId },
      include: {
        claims: {
          include: {
            InsuranceProvider: true,
            Patient: true,
            Attendance: true,
            Bill: true
          }
        },
        createdBy: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });
  });

  return batch;
};

export const removeClaimsFromBatch = async (
  batchId: string,
  claimIds: string[]
) => {
  if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
    throw new Error('At least one claim ID is required');
  }

  const batch = await prisma.$transaction(async (tx) => {
    const existingBatch = await tx.claimBatch.findUnique({
      where: { id: batchId },
      include: {
        claims: {
          where: { id: { in: claimIds } },
          select: { id: true, totalClaimAmount: true }
        }
      }
    });

    if (!existingBatch) {
      throw new Error('Batch not found');
    }

    if (existingBatch.status !== 'draft') {
      throw new Error('Can only remove claims from draft batches');
    }

    // Calculate amount to remove
    const removedAmount = existingBatch.claims.reduce((sum, c) => sum + c.totalClaimAmount, 0);

    // Remove claims from batch
    await tx.claimBatch.update({
      where: { id: batchId },
      data: {
        totalAmount: existingBatch.totalAmount - removedAmount,
        claims: {
          disconnect: claimIds.map(id => ({ id }))
        }
      }
    });

    // Remove batchId from claims
    await tx.insuranceClaim.updateMany({
      where: { id: { in: claimIds } },
      data: { batchId: null }
    });

    // Return updated batch
    return await tx.claimBatch.findUnique({
      where: { id: batchId },
      include: {
        claims: {
          include: {
            InsuranceProvider: true,
            Patient: true,
            Attendance: true,
            Bill: true
          }
        },
        createdBy: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });
  });

  return batch;
};

export const generateBatchXML = async (batchId: string) => {
  const batch = await prisma.claimBatch.findUnique({
    where: { id: batchId },
    include: {
      claims: {
        include: {
          InsuranceProvider: true,
          Patient: true,
          Attendance: true,
          Bill: true
        }
      },
      createdBy: true
    }
  });

  if (!batch) {
    throw new Error('Batch not found');
  }

  if (batch.claims.length === 0) {
    throw new Error('Batch has no claims');
  }

  // Generate XML for each claim in the batch
  const facilityCode = process.env.NHIS_FACILITY_CODE || 'FAC001';
  const batchXml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISBatchSubmission>
  <BatchInfo>
    <BatchNumber>${batch.batchNumber}</BatchNumber>
    <BatchDate>${batch.batchDate.toISOString()}</BatchDate>
    <FacilityCode>${facilityCode}</FacilityCode>
    <TotalClaims>${batch.claims.length}</TotalClaims>
    <TotalAmount>${batch.totalAmount}</TotalAmount>
    <GeneratedBy>${batch.createdBy.fullName || batch.createdBy.username}</GeneratedBy>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </BatchInfo>
  <Claims>
${batch.claims.map(claim => `    <Claim>
      <ClaimNumber>${claim.claimNumber}</ClaimNumber>
      <PatientCCC>${claim.Attendance?.nhisCCC || ''}</PatientCCC>
      <PatientName>${claim.Patient?.surname || ''} ${claim.Patient?.otherNames || ''}</PatientName>
      <TotalAmount>${claim.totalClaimAmount}</TotalAmount>
      <DiagnosisCodes>${claim.diagnosisCodes?.join(',') || ''}</DiagnosisCodes>
      <GDRGCodes>${claim.gdrgCodes?.join(',') || ''}</GDRGCodes>
    </Claim>`).join('\n')}
  </Claims>
</NHISBatchSubmission>`;

  // Update batch status
  await prisma.claimBatch.update({
    where: { id: batchId },
    data: {
      status: 'generated',
      xmlGeneratedAt: new Date()
    }
  });

  return { xml: batchXml, batchNumber: batch.batchNumber };
};

export const updateBatchStatus = async (
  batchId: string,
  status: string
) => {
  if (!status) {
    throw new Error('Status is required');
  }

  const validStatuses = ['draft', 'generated', 'submitted', 'exported'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status value');
  }

  const batch = await prisma.claimBatch.update({
    where: { id: batchId },
    data: {
      status: status as any,
      ...(status === 'submitted' ? { submissionDate: new Date() } : {})
    },
    include: {
      claims: {
        include: {
          InsuranceProvider: true,
          Patient: true,
          Attendance: true,
          Bill: true
        }
      },
      createdBy: {
        select: { id: true, fullName: true, username: true }
      }
    }
  });

  return batch;
};

export const deleteClaimBatch = async (batchId: string) => {
  const batch = await prisma.$transaction(async (tx) => {
    const existingBatch = await tx.claimBatch.findUnique({
      where: { id: batchId },
      include: { claims: true }
    });

    if (!existingBatch) {
      throw new Error('Batch not found');
    }

    if (existingBatch.status !== 'draft') {
      throw new Error('Can only delete draft batches');
    }

    // Remove batchId from all claims in the batch
    await tx.insuranceClaim.updateMany({
      where: { batchId },
      data: { batchId: null }
    });

    // Delete the batch
    await tx.claimBatch.delete({
      where: { id: batchId }
    });

    return existingBatch;
  });

  return batch;
};

// ==========================================
// GENERAL CLAIM SERVICES
// ==========================================

export const getAllInsuranceClaims = async (
  status?: string | string[],
  insuranceProviderId?: string,
  patientId?: string,
  dateFrom?: Date,
  dateTo?: Date,
  page: number = 1,
  limit: number = 50
) => {
  const where: any = {};

  if (status) {
    if (typeof status === 'string' && status.includes(',')) {
      const statusArray = status.split(',').map(s => s.trim());
      where.status = { in: statusArray };
    } else {
      where.status = status;
    }
  }

  if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
  if (patientId) where.patientId = patientId;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, Math.max(1, limit));
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

  return {
    data: claims,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

export const getInsuranceClaim = async (claimId: string) => {
  const claim = await prisma.insuranceClaim.findUnique({
    where: { id: claimId },
    include: {
      InsuranceProvider: true,
      Patient: true,
      Attendance: true,
      Bill: true
    }
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  return claim;
};

export const getClaimByAttendanceId = async (attendanceId: string) => {
  const claim = await prisma.insuranceClaim.findFirst({
    where: { attendanceId },
    include: {
      InsuranceProvider: true,
      Patient: true,
      Attendance: true,
      Bill: true
    }
  });

  if (!claim) {
    throw new Error('No claim found for this attendance');
  }

  return claim;
};

export const updateClaimDraft = async (
  claimId: string,
  updateData: any,
  userId: string
) => {
  const fields = ['diagnosisCodes', 'procedureCodes', 'labTestCodes', 'scanCodes', 
                   'serviceCodes', 'totalClaimAmount', 'notes', 'preAuthNumber',
                   'principalGDRG', 'typeOfService', 'serviceOutcome', 'typeOfAttendance',
                   'mdcCode', 'datesOfService', 'metadata']; // ✅ Add metadata
  
  const dataToUpdate: any = { updatedById: userId, updatedAt: new Date() };
  
  for (const field of fields) {
    if (updateData[field] !== undefined) {
      dataToUpdate[field] = updateData[field];
    }
  }

  const claim = await prisma.insuranceClaim.update({
    where: { id: claimId },
    data: dataToUpdate
  });

  return claim;
};

export const finalizeClaim = async (claimId: string, userId: string) => {
  const claim = await prisma.insuranceClaim.findUnique({
    where: { id: claimId }
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  if (claim.status !== 'draft') {
    throw new Error('Only draft claims can be finalized');
  }

  const finalizedClaim = await prisma.insuranceClaim.update({
    where: { id: claimId },
    data: {
      status: 'submitted',
      submissionDate: new Date(),
      updatedById: userId
    }
  });

  return finalizedClaim;
};

export const updateClaimStatus = async (
  claimId: string,
  status: string,
  notes?: string,
  userId?: string
) => {
  const validStatuses = ['draft', 'submitted', 'approved', 'paid', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status value');
  }

  const updateData: any = {
    status,
    updatedById: userId,
    updatedAt: new Date()
  };

  if (status === 'submitted') updateData.submissionDate = new Date();
  if (status === 'approved') updateData.approvalDate = new Date();
  if (status === 'paid') updateData.paymentDate = new Date();
  if (notes) updateData.notes = notes;

  const claim = await prisma.insuranceClaim.update({
    where: { id: claimId },
    data: updateData
  });

  return claim;
};

export const getFinalizedClaimsTotal = async (
  dateFrom?: Date,
  dateTo?: Date,
  type?: string
) => {
  const where: any = { status: 'submitted' };

  if (type === 'nhis') where.InsuranceProvider = { type: 'nhis' };
  if (type === 'private') where.InsuranceProvider = { type: 'private' };

  if (dateFrom || dateTo) {
    where.submissionDate = {};
    if (dateFrom) where.submissionDate.gte = dateFrom;
    if (dateTo) where.submissionDate.lte = dateTo;
  }

  const claims = await prisma.insuranceClaim.findMany({
    where,
    include: {
      InsuranceProvider: true,
      Patient: true
    }
  });

  return {
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
  };
};

// ==========================================
// NHIS CLAIM SERVICES
// ==========================================

export const generateNHISClaim = async (
  attendanceId: string,
  userId: string
) => {
  const result = await prisma.$transaction(async (tx) => {
    const existingClaim = await tx.insuranceClaim.findFirst({
      where: { attendanceId, InsuranceProvider: { type: 'nhis' } }
    });

    if (existingClaim) {
      return { claim: existingClaim, isExisting: true };
    }

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

    const claim = await tx.insuranceClaim.create({
      data: {
        claimNumber,
        billId: attendance.Bill?.id,
        patientId: attendance.patientId,
        attendanceId: attendance.id,
        insuranceProviderId: attendance.insuranceProviderId,
        totalClaimAmount,
        status: 'draft',
        createdById: userId,
        diagnosisCodes,
        labTestCodes,
        procedureCodes,
        medicationCodes,
        serviceCodes,
        gdrgCodes: [principalGDRG],
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

  return result;
};

export const getNHISClaims = async (
  status?: string,
  patientId?: string,
  startDate?: Date,
  endDate?: Date,
  page: number = 1,
  limit: number = 50
) => {
  const where: any = { InsuranceProvider: { type: 'nhis' } };
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  // Add date range filtering based on attendance dateTime
  if (startDate || endDate) {
    where.Attendance = {};
    if (startDate) {
      where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: startDate };
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: endDateObj };
    }
  }

  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, limit);
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

  return {
    data: claims,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

// ==========================================
// PRIVATE INSURANCE CLAIM SERVICES
// ==========================================

export const generatePrivateInsuranceClaim = async (
  attendanceId: string,
  userId: string
) => {
  const result = await prisma.$transaction(async (tx) => {
    const existingClaim = await tx.insuranceClaim.findFirst({
      where: { attendanceId, InsuranceProvider: { type: 'private' } }
    });

    if (existingClaim) {
      return { claim: existingClaim, isExisting: true };
    }

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
        createdById: userId,
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

  return result;
};

export const getPrivateInsuranceClaims = async (
  status?: string,
  patientId?: string,
  startDate?: Date,
  endDate?: Date,
  page: number = 1,
  limit: number = 50
) => {
  const where: any = { InsuranceProvider: { type: 'private' } };
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  // Add date range filtering based on attendance dateTime
  if (startDate || endDate) {
    where.Attendance = {};
    if (startDate) {
      where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: startDate };
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: endDateObj };
    }
  }

  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, limit);
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

  return {
    data: claims,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

// ==========================================
// CORPORATE CLAIM SERVICES
// ==========================================

export const generateCorporateClaim = async (
  attendanceId: string,
  userId: string
) => {
  const result = await prisma.$transaction(async (tx) => {
    const existingClaim = await tx.insuranceClaim.findFirst({
      where: { attendanceId, InsuranceProvider: { type: 'corporate' } }
    });

    if (existingClaim) {
      return { claim: existingClaim, isExisting: true };
    }

    const attendance = await tx.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Patient: true,
        InsuranceProvider: true,
        CorporateAccount: true,
        Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } },
        AttendanceDiagnosis: { include: { Diagnosis: true } },
        ServiceRendered: { include: { ServiceCatalog: true } },
        LabTest: { include: { ServiceCatalog: true } },
        Medication: { include: { ServiceCatalog: true } },
        Procedure: { include: { ServiceCatalog: true } },
        Scan: { include: { ServiceCatalog: true } },
        Admission: true
      }
    });

    if (!attendance) throw new Error('Attendance not found');
    if (!attendance.InsuranceProvider || attendance.InsuranceProvider.type !== 'corporate') {
      throw new Error('Attendance is not for corporate insurance');
    }
    if (!attendance.corporateAccountId) {
      throw new Error('Corporate account ID is required');
    }

    // Verify corporate account is active and has credit limit
    const corporateAccount = await tx.corporateAccount.findUnique({
      where: { id: attendance.corporateAccountId }
    });

    if (!corporateAccount || !corporateAccount.isActive) {
      throw new Error('Corporate account is not active');
    }

    const claimNumber = `CORP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const diagnosisCodes = safeMap(attendance.AttendanceDiagnosis, d => d.Diagnosis?.icdCode);
    const procedureCodes = safeMap(attendance.Procedure, p => p.ServiceCatalog?.code);
    const labTestCodes = safeMap(attendance.LabTest, lt => lt.ServiceCatalog?.code);
    const scanCodes = safeMap(attendance.Scan, s => s.ServiceCatalog?.code);
    const serviceCodes = safeMap(attendance.ServiceRendered, s => s.ServiceCatalog?.code);
    const medicationCodes = safeMap(attendance.Medication, m =>
      m.StockItem?.drugCode || m.ServiceCatalog?.code
    );
    const totalClaimAmount = attendance.Bill?.totalAmount || 0;

    // Check credit limit
    const outstandingBalance = await tx.insuranceClaim.aggregate({
      where: {
        insuranceProviderId: attendance.insuranceProviderId,
        corporateAccountId: attendance.corporateAccountId,
        status: { in: ['submitted', 'approved'] }
      },
      _sum: { totalClaimAmount: true }
    });

    const currentBalance = (outstandingBalance._sum.totalClaimAmount || 0);
    const projectedBalance = currentBalance + totalClaimAmount;

    if (projectedBalance > (corporateAccount.creditLimit || 0)) {
      throw new Error(`Claim would exceed corporate credit limit. Current: GHS ${currentBalance.toFixed(2)}, Limit: GHS ${corporateAccount.creditLimit}`);
    }

    const claim = await tx.insuranceClaim.create({
      data: {
        claimNumber,
        billId: attendance.Bill?.id,
        patientId: attendance.patientId,
        attendanceId: attendance.id,
        insuranceProviderId: attendance.insuranceProviderId,
        corporateAccountId: attendance.corporateAccountId,
        totalClaimAmount,
        status: 'submitted', // Corporate claims auto-submit as they're credit-based
        createdById: userId,
        diagnosisCodes,
        procedureCodes,
        labTestCodes,
        scanCodes,
        serviceCodes,
        medicationCodes,
        notes: `Corporate claim - Employee ID: ${attendance.corporateEmployeeId || 'N/A'}. Itemized billing.`
      }
    });

    await tx.attendance.update({
      where: { id: attendanceId },
      data: { insuranceClaimId: claim.id }
    });

    return {
      claim,
      isExisting: false,
      creditInfo: {
        currentBalance,
        projectedBalance,
        limit: corporateAccount.creditLimit
      }
    };
  });

  return result;
};

export const getCorporateClaims = async (
  status?: string,
  patientId?: string,
  startDate?: Date,
  endDate?: Date,
  corporateAccountId?: string,
  page: number = 1,
  limit: number = 50
) => {
  const where: any = { InsuranceProvider: { type: 'corporate' } };
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;
  if (corporateAccountId) where.corporateAccountId = corporateAccountId;

  // Add date range filtering based on attendance dateTime
  if (startDate || endDate) {
    where.Attendance = {};
    if (startDate) {
      where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: startDate };
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: endDateObj };
    }
  }

  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, limit);
  const skip = (pageNum - 1) * limitNum;

  const [claims, total] = await Promise.all([
    prisma.insuranceClaim.findMany({
      where,
      include: {
        InsuranceProvider: { select: { id: true, name: true, type: true } },
        CorporateAccount: { select: { id: true, companyName: true, companyCode: true } },
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, corporateEmployeeId: true } },
        Bill: { select: { id: true, billNumber: true, totalAmount: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.insuranceClaim.count({ where })
  ]);

  return {
    data: claims,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};
