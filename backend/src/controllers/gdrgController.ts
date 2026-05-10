// controllers/gdrgController.ts - COMPLETE VERSION ALIGNED WITH SCHEMA
import { Request, Response } from 'express';
import { PrismaClient, GDRGMDC } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// ==================== HELPER FUNCTIONS ====================
const calculateAgeInDays = (dateOfBirth: Date, asOfDate: Date): number => {
  const diffTime = asOfDate.getTime() - dateOfBirth.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// ==================== GDRG TARIFF CRUD ====================
export const getGDRGTariffs = async (req: AuthRequest, res: Response) => {
  try {
    const { mdc, isActive, search } = req.query;
    
    const where: any = {};
    if (mdc) where.mdc = mdc as GDRGMDC;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { gdrgCode: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { nhisServiceCode: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const tariffs = await prisma.gDRGTariff.findMany({
      where,
      include: {
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                morbidityGroup: true
              }
            }
          }
        },
        ServiceCatalog: {
          select: {
            id: true,
            name: true,
            code: true,
            serviceType: true
          }
        }
      },
      orderBy: { gdrgCode: 'asc' }
    });

    res.json({ success: true, data: tariffs, count: tariffs.length });
  } catch (error) {
    console.error('Error fetching GDRG tariffs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching GDRG tariffs', 
      error: (error as Error).message 
    });
  }
};

export const getGDRGByCode = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    
    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode: code },
      include: {
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                morbidityGroup: true,
                gdrgTariffDiagnoses: true
              }
            }
          }
        },
        ServiceCatalog: {
          select: {
            id: true,
            name: true,
            code: true,
            serviceType: true,
            pricing: {
              select: {
                cashPrice: true,
                nhisPrice: true,
                insurancePrice: true
              }
            }
          }
        }
      }
    });

    if (!tariff) {
      return res.status(404).json({ 
        success: false, 
        message: 'GDRG tariff not found' 
      });
    }

    res.json({ success: true, data: tariff });
  } catch (error) {
    console.error('Error fetching GDRG tariff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching GDRG tariff', 
      error: (error as Error).message 
    });
  }
};

// Age-based GDRG lookup for NHIS claims
export const lookupGDRGByAge = async (req: AuthRequest, res: Response) => {
  try {
    const { gdrgCode, patientId, attendanceDate, ageInYears } = req.query;

    if (!gdrgCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'GDRG code is required' 
      });
    }

    let ageInDays: number | undefined;
    let patientInfo: any = null;

    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId as string },
        select: { dateOfBirth: true, folderNumber: true }
      });
      
      if (patient) {
        const asOfDate = attendanceDate ? new Date(attendanceDate as string) : new Date();
        ageInDays = calculateAgeInDays(patient.dateOfBirth, asOfDate);
        patientInfo = {
          id: patientId,
          ageInDays,
          ageInYears: Math.floor(ageInDays / 365.25),
          folderNumber: patient.folderNumber
        };
      }
    } else if (ageInYears) {
      ageInDays = parseInt(ageInYears as string) * 365;
    }

    // Build query for GDRG tariff
    const where: any = {
      gdrgCode: gdrgCode as string,
      isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } }
      ]
    };

    // Apply age filter if age is known
    if (ageInDays !== undefined) {
      const ageInYearsNum = Math.floor(ageInDays / 365);
      where.AND = [
        {
          OR: [
            { minAgeYears: null },
            { minAgeYears: { lte: ageInYearsNum } }
          ]
        },
        {
          OR: [
            { maxAgeYears: null },
            { maxAgeYears: { gte: ageInYearsNum } }
          ]
        }
      ];
    }

    const tariff = await prisma.gDRGTariff.findFirst({
      where,
      orderBy: { effectiveFrom: 'desc' }
    });

    // Determine age split (A for Adult >=12, C for Child <12)
    const patientAge = ageInDays ? Math.floor(ageInDays / 365) : null;
    const ageSplit = patientAge !== null && patientAge < 12 ? 'C' : 'A';

    res.json({
      success: true,
      data: {
        gdrgCode: gdrgCode as string,
        patient: patientInfo,
        tariff: tariff || null,
        ageSplit,
        message: tariff ? 'Tariff found' : 'No matching tariff found for this age'
      }
    });
  } catch (error) {
    console.error('Error looking up GDRG by age:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error looking up GDRG tariff', 
      error: (error as Error).message 
    });
  }
};

export const createGDRGTariff = async (req: AuthRequest, res: Response) => {
  try {
    const {
      gdrgCode,
      mdc,
      description,
      nhiaTariff,
      ageSplit,
      minAgeYears,
      maxAgeYears,
      applicableLevels,
      nhisServiceCode,
      isZoomCode,
      allowsAddOn,
      effectiveFrom,
      effectiveTo,
      notes,
      encounterCategory,
      attendanceTypes,
      isAntenatal,
      isDelivery
    } = req.body;

    // Validate required fields
    if (!gdrgCode || !mdc || !description || nhiaTariff === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: gdrgCode, mdc, description, nhiaTariff' 
      });
    }

    // Check for duplicate GDRG code
    const existingTariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode }
    });

    if (existingTariff) {
      return res.status(400).json({ 
        success: false, 
        message: 'GDRG code already exists' 
      });
    }

    const tariff = await prisma.gDRGTariff.create({
      data: {
        gdrgCode,
        mdc: mdc as GDRGMDC,
        description,
        nhiaTariff: parseFloat(nhiaTariff),
        ageSplit: ageSplit || 'A',
        minAgeYears: minAgeYears ? parseInt(minAgeYears) : null,
        maxAgeYears: maxAgeYears ? parseInt(maxAgeYears) : null,
        applicableLevels: applicableLevels || [1, 2, 3],
        nhisServiceCode: nhisServiceCode || null,
        isZoomCode: isZoomCode || false,
        allowsAddOn: allowsAddOn || false,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        notes: notes || null,
        isActive: true,
        // ✅ Add schema fields
        encounterCategory: encounterCategory || null,
        attendanceTypes: attendanceTypes || [],
        isAntenatal: isAntenatal || false,
        isDelivery: isDelivery || false
      }
    });

    res.status(201).json({ 
      success: true, 
      data: tariff, 
      message: 'GDRG tariff created successfully' 
    });
  } catch (error) {
    console.error('Error creating GDRG tariff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating GDRG tariff', 
      error: (error as Error).message 
    });
  }
};

export const updateGDRGTariff = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const updateData = req.body;

    const existingTariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode: code }
    });

    if (!existingTariff) {
      return res.status(404).json({ 
        success: false, 
        message: 'GDRG tariff not found' 
      });
    }

    // Convert numeric fields
    if (updateData.nhiaTariff !== undefined) updateData.nhiaTariff = parseFloat(updateData.nhiaTariff);
    if (updateData.minAgeYears !== undefined) updateData.minAgeYears = updateData.minAgeYears ? parseInt(updateData.minAgeYears) : null;
    if (updateData.maxAgeYears !== undefined) updateData.maxAgeYears = updateData.maxAgeYears ? parseInt(updateData.maxAgeYears) : null;

    const tariff = await prisma.gDRGTariff.update({
      where: { gdrgCode: code },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      data: tariff, 
      message: 'GDRG tariff updated successfully' 
    });
  } catch (error) {
    console.error('Error updating GDRG tariff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating GDRG tariff', 
      error: (error as Error).message 
    });
  }
};

export const deleteGDRGTariff = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;

    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode: code },
      include: { 
        diagnoses: true,
        ServiceCatalog: true 
      }
    });

    if (!tariff) {
      return res.status(404).json({ 
        success: false, 
        message: 'GDRG tariff not found' 
      });
    }

    // Check for dependencies
    if (tariff.diagnoses.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete GDRG tariff with associated diagnoses. Remove diagnosis links first.' 
      });
    }

    if (tariff.ServiceCatalog.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete GDRG tariff with associated service catalog items.' 
      });
    }

    await prisma.gDRGTariff.delete({
      where: { gdrgCode: code }
    });

    res.json({ 
      success: true, 
      message: 'GDRG tariff deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting GDRG tariff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting GDRG tariff', 
      error: (error as Error).message 
    });
  }
};

// Link diagnosis to GDRG tariff
export const linkDiagnosisToGDRG = async (req: AuthRequest, res: Response) => {
  try {
    const { gdrgCode } = req.params;
    const { diagnosisId, isPrimary, mappedIcdCode } = req.body;

    if (!diagnosisId) {
      return res.status(400).json({ 
        success: false, 
        message: 'diagnosisId is required' 
      });
    }

    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode }
    });

    if (!tariff) {
      return res.status(404).json({ 
        success: false, 
        message: 'GDRG tariff not found' 
      });
    }

    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id: diagnosisId }
    });

    if (!diagnosis) {
      return res.status(404).json({ 
        success: false, 
        message: 'Diagnosis not found' 
      });
    }

    // Check if link already exists
    const existingLink = await prisma.gDRGTariffDiagnosis.findUnique({
      where: {
        gdrgTariffId_diagnosisId: {
          gdrgTariffId: tariff.id,
          diagnosisId
        }
      }
    });

    if (existingLink) {
      return res.status(400).json({ 
        success: false, 
        message: 'Diagnosis already linked to this GDRG tariff' 
      });
    }

    const link = await prisma.gDRGTariffDiagnosis.create({
      data: {
        gdrgTariffId: tariff.id,
        diagnosisId,
        isPrimary: isPrimary || false,
        mappedIcdCode: mappedIcdCode || diagnosis.icdCode
      },
      include: {
        gdrgTariff: true,
        diagnosis: true
      }
    });

    res.json({ 
      success: true, 
      data: link, 
      message: 'Diagnosis linked to GDRG tariff successfully' 
    });
  } catch (error) {
    console.error('Error linking diagnosis to GDRG:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error linking diagnosis to GDRG', 
      error: (error as Error).message 
    });
  }
};

export const unlinkDiagnosisFromGDRG = async (req: AuthRequest, res: Response) => {
  try {
    const { gdrgCode, diagnosisId } = req.params;

    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode }
    });

    if (!tariff) {
      return res.status(404).json({ 
        success: false, 
        message: 'GDRG tariff not found' 
      });
    }

    await prisma.gDRGTariffDiagnosis.delete({
      where: {
        gdrgTariffId_diagnosisId: {
          gdrgTariffId: tariff.id,
          diagnosisId
        }
      }
    });

    res.json({ 
      success: true, 
      message: 'Diagnosis unlinked from GDRG tariff successfully' 
    });
  } catch (error) {
    console.error('Error unlinking diagnosis from GDRG:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error unlinking diagnosis from GDRG', 
      error: (error as Error).message 
    });
  }
};

// ==========================================
// DIAGNOSIS LINKING - GET DIAGNOSES BY GDRG
// ==========================================

export const getDiagnosesByGDRG = async (req: AuthRequest, res: Response) => {
  try {
    const { gdrgCode } = req.params;

    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode },
      include: {
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                morbidityGroup: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!tariff) {
      return res.status(404).json({ success: false, message: 'GDRG tariff not found' });
    }

    // Transform the response to a clean array
    const linkedDiagnoses = tariff.diagnoses.map(d => ({
      id: d.id,
      diagnosisId: d.diagnosisId,
      name: d.diagnosis?.name,
      icdCode: d.diagnosis?.icdCode,
      morbidityGroup: d.diagnosis?.morbidityGroup,
      isPrimary: d.isPrimary,
      mappedIcdCode: d.mappedIcdCode
    }));

    console.log(`✅ Found ${linkedDiagnoses.length} linked diagnoses for ${gdrgCode}`);

    res.json({ 
      success: true, 
      data: linkedDiagnoses,
      count: linkedDiagnoses.length
    });
  } catch (error) {
    console.error('Error fetching diagnoses by GDRG:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching diagnoses', 
      error: (error as Error).message 
    });
  }
};

// ==========================================
// DIAGNOSIS LINKING - GET GDRG BY DIAGNOSIS
// ==========================================

export const getGDRGByDiagnosis = async (req: AuthRequest, res: Response) => {
  try {
    const { diagnosisId } = req.params;

    const links = await prisma.gDRGTariffDiagnosis.findMany({
      where: { diagnosisId },
      include: {
        gdrgTariff: {
          select: {
            id: true,
            gdrgCode: true,
            description: true,
            nhiaTariff: true,
            mdc: true,
            ageSplit: true,
            isActive: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      data: links.map(l => ({
        id: l.gdrgTariff.id,
        gdrgCode: l.gdrgTariff.gdrgCode,
        description: l.gdrgTariff.description,
        nhiaTariff: l.gdrgTariff.nhiaTariff,
        mdc: l.gdrgTariff.mdc,
        ageSplit: l.gdrgTariff.ageSplit,
        isActive: l.gdrgTariff.isActive,
        isPrimary: l.isPrimary
      }))
    });
  } catch (error) {
    console.error('Error fetching GDRG by diagnosis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching GDRG tariff', 
      error: (error as Error).message 
    });
  }
};

// ==========================================
// PROCEDURE TO GDRG LINKING (Same style as Diagnosis)
// ==========================================

export const linkProcedureToGDRG = async (req: AuthRequest, res: Response) => {
  try {
    const { gdrgCode } = req.params;
    const { procedureId, isPrimary, mappedCode } = req.body;

    if (!procedureId) {
      return res.status(400).json({ success: false, message: 'procedureId is required' });
    }

    const tariff = await prisma.gDRGTariff.findUnique({ where: { gdrgCode } });
    if (!tariff) {
      return res.status(404).json({ success: false, message: 'GDRG tariff not found' });
    }

    const procedure = await prisma.serviceCatalog.findFirst({
      where: { id: procedureId, serviceType: 'procedure' }
    });
    if (!procedure) {
      return res.status(404).json({ success: false, message: 'Procedure not found' });
    }

    const existingLink = await prisma.gDRGTariffProcedure.findUnique({
      where: {
        gdrgTariffId_procedureId: {
          gdrgTariffId: tariff.id,
          procedureId
        }
      }
    });

    if (existingLink) {
      return res.status(400).json({ success: false, message: 'Procedure already linked to this GDRG tariff' });
    }

    const link = await prisma.gDRGTariffProcedure.create({
      data: {
        gdrgTariffId: tariff.id,
        procedureId,
        isPrimary: isPrimary || false,
        mappedCode: mappedCode || procedure.code
      },
      include: { gdrgTariff: true, procedure: true }
    });

    res.json({ success: true, data: link, message: 'Procedure linked to GDRG tariff successfully' });
  } catch (error) {
    console.error('Error linking procedure to GDRG:', error);
    res.status(500).json({ success: false, message: 'Error linking procedure to GDRG', error: (error as Error).message });
  }
};

export const unlinkProcedureFromGDRG = async (req: AuthRequest, res: Response) => {
  try {
    const { gdrgCode, procedureId } = req.params;

    const tariff = await prisma.gDRGTariff.findUnique({ where: { gdrgCode } });
    if (!tariff) {
      return res.status(404).json({ success: false, message: 'GDRG tariff not found' });
    }

    await prisma.gDRGTariffProcedure.delete({
      where: {
        gdrgTariffId_procedureId: {
          gdrgTariffId: tariff.id,
          procedureId
        }
      }
    });

    res.json({ success: true, message: 'Procedure unlinked from GDRG tariff successfully' });
  } catch (error) {
    console.error('Error unlinking procedure from GDRG:', error);
    res.status(500).json({ success: false, message: 'Error unlinking procedure from GDRG', error: (error as Error).message });
  }
};

export const getProceduresByGDRG = async (req: AuthRequest, res: Response) => {
  try {
    const { gdrgCode } = req.params;

    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode },
      include: {
        procedures: {
          include: {
            procedure: {
              include: { pricing: true }
            }
          }
        }
      }
    });

    if (!tariff) {
      return res.status(404).json({ success: false, message: 'GDRG tariff not found' });
    }

    res.json({
      success: true,
      data: tariff.procedures.map(p => ({
        id: p.procedure.id,
        name: p.procedure.name,
        code: p.procedure.code,
        isPrimary: p.isPrimary,
        mappedCode: p.mappedCode,
        cashPrice: p.procedure.pricing?.cashPrice,
        nhisPrice: p.procedure.pricing?.nhisPrice
      }))
    });
  } catch (error) {
    console.error('Error fetching procedures by GDRG:', error);
    res.status(500).json({ success: false, message: 'Error fetching procedures', error: (error as Error).message });
  }
};

export const getGDRGByProcedure = async (req: AuthRequest, res: Response) => {
  try {
    const { procedureId } = req.params;

    const links = await prisma.gDRGTariffProcedure.findMany({
      where: { procedureId },
      include: { gdrgTariff: true }
    });

    res.json({
      success: true,
      data: links.map(l => ({
        id: l.gdrgTariff.id,
        gdrgCode: l.gdrgTariff.gdrgCode,
        description: l.gdrgTariff.description,
        nhiaTariff: l.gdrgTariff.nhiaTariff,
        isPrimary: l.isPrimary
      }))
    });
  } catch (error) {
    console.error('Error fetching GDRG by procedure:', error);
    res.status(500).json({ success: false, message: 'Error fetching GDRG tariff', error: (error as Error).message });
  }
};