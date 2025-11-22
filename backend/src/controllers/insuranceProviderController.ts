import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, InsuranceType } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Utility function for consistent error responses
const handleError = (res: Response, message: string, error: any, statusCode = 500) => {
  console.error(`❌ ${message}:`, error);
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export const getInsuranceProviders = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🏥 Fetching insurance providers...', {
      user: req.user?.username,
      role: req.user?.role
    });

    const { isActive = 'true', type } = req.query;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (type) {
      where.type = type as InsuranceType;
    }

    const providers = await prisma.InsuranceProvider.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            Patient: true,
            Attendance: true,
            Bill: true,
            InsuranceClaim: true
          }
        }
      }
    });

    console.log(`✅ Found ${providers.length} insurance providers`);

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    handleError(res, 'Error fetching insurance providers', error);
  }
};

export const getInsuranceProviderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🏥 Fetching insurance provider by ID:', id);

    const provider = await prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        patients: {
          select: {
            id: true,
            folderNumber: true,
            fullName: true,
            contact: true
          },
          take: 10,
          orderBy: { fullName: 'asc' }
        },
        attendances: {
          select: {
            id: true,
            attendanceNumber: true,
            attendanceType: true,
            status: true,
            dateTime: true
          },
          take: 10,
          orderBy: { dateTime: 'desc' }
        },
        bills: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            status: true,
            billDate: true
          },
          take: 10,
          orderBy: { billDate: 'desc' }
        },
        insuranceClaims: {
          select: {
            id: true,
            claimNumber: true,
            totalClaimAmount: true,
            status: true,
            submissionDate: true
          },
          take: 10,
          orderBy: { submissionDate: 'desc' }
        },
        _count: {
          select: {
            patients: true,
            attendances: true,
            bills: true,
            insuranceClaims: true
          }
        }
      }
    });

    if (!provider) {
      console.log('❌ Insurance provider not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Insurance provider not found'
      });
    }

    console.log('✅ Insurance provider fetched successfully:', provider.name);

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    handleError(res, 'Error fetching insurance provider', error);
  }
};

export const createInsuranceProvider = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('type')
    .isIn(Object.values(InsuranceType))
    .withMessage('Valid type is required'),
  body('coveragePercentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Coverage percentage must be between 0 and 100'),
  body('contactInfo')
    .optional()
    .isObject()
    .withMessage('Contact info must be a valid object'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Create insurance provider validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const {
        name,
        type,
        coveragePercentage,
        contactInfo
      } = req.body;

      console.log('🏥 Creating new insurance provider...', {
        user: req.user?.username,
        data: { name, type, coveragePercentage }
      });

      // Check for duplicate name
      const existingProvider = await prisma.insuranceProvider.findFirst({
        where: {
          name: { equals: name.trim(), mode: 'insensitive' },
          isActive: true
        }
      });

      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: 'An insurance provider with this name already exists'
        });
      }

      const provider = await prisma.insuranceProvider.create({
        data: {
          name: name.trim(),
          type: type as InsuranceType,
          coveragePercentage: parseFloat(coveragePercentage),
          contactInfo: contactInfo || null,
          isActive: true
        },
        include: {
          _count: {
            select: {
              patients: true,
              attendances: true,
              bills: true,
              insuranceClaims: true
            }
          }
        }
      });

      console.log('✅ Insurance provider created successfully:', provider.name);

      res.status(201).json({
        success: true,
        data: provider,
        message: 'Insurance provider created successfully'
      });

    } catch (error) {
      handleError(res, 'Error creating insurance provider', error);
    }
  }
];

export const updateInsuranceProvider = [
  body('name')
    .optional()
    .notEmpty().withMessage('Name cannot be empty')
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('type')
    .optional()
    .isIn(Object.values(InsuranceType))
    .withMessage('Valid type is required'),
  body('coveragePercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Coverage percentage must be between 0 and 100'),
  body('contactInfo')
    .optional()
    .isObject()
    .withMessage('Contact info must be a valid object'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Update insurance provider validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { id } = req.params;
      const updateData = { ...req.body };

      console.log('📝 Updating insurance provider:', id, {
        updates: Object.keys(updateData)
      });

      // Check if provider exists
      const existingProvider = await prisma.insuranceProvider.findUnique({
        where: { id }
      });

      if (!existingProvider) {
        return res.status(404).json({
          success: false,
          message: 'Insurance provider not found'
        });
      }

      // Check for duplicate name (excluding current provider)
      if (updateData.name && updateData.name !== existingProvider.name) {
        const duplicateProvider = await prisma.insuranceProvider.findFirst({
          where: {
            name: { equals: updateData.name.trim(), mode: 'insensitive' },
            id: { not: id },
            isActive: true
          }
        });

        if (duplicateProvider) {
          return res.status(400).json({
            success: false,
            message: 'Another insurance provider with this name already exists'
          });
        }
        updateData.name = updateData.name.trim();
      }

      // Convert numeric field if provided
      if (updateData.coveragePercentage !== undefined) {
        updateData.coveragePercentage = parseFloat(updateData.coveragePercentage);
      }

      const provider = await prisma.insuranceProvider.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              patients: true,
              attendances: true,
              bills: true,
              insuranceClaims: true
            }
          }
        }
      });

      console.log('✅ Insurance provider updated successfully:', provider.name);

      res.json({
        success: true,
        data: provider,
        message: 'Insurance provider updated successfully'
      });

    } catch (error) {
      if ((error as any).code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Insurance provider not found'
        });
      }
      handleError(res, 'Error updating insurance provider', error);
    }
  }
];

export const deleteInsuranceProvider = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting insurance provider:', id);

    // Check if provider exists and has related records
    const provider = await prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        patients: { take: 1 },
        attendances: { take: 1 },
        bills: { take: 1 },
        insuranceClaims: { take: 1 }
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Insurance provider not found'
      });
    }

    // Check if provider has any related records
    const hasRelatedRecords =
      provider.patients.length > 0 ||
      provider.attendances.length > 0 ||
      provider.bills.length > 0 ||
      provider.insuranceClaims.length > 0;

    if (hasRelatedRecords) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete insurance provider with existing patients, attendances, bills, or insurance claims'
      });
    }

    await prisma.insuranceProvider.delete({
      where: { id }
    });

    console.log('✅ Insurance provider deleted successfully:', provider.name);

    res.json({
      success: true,
      message: 'Insurance provider deleted successfully'
    });

  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Insurance provider not found'
      });
    }
    handleError(res, 'Error deleting insurance provider', error);
  }
};

export const toggleInsuranceProviderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🔄 Toggling insurance provider status:', id);

    // Check if provider exists
    const existingProvider = await prisma.insuranceProvider.findUnique({
      where: { id }
    });

    if (!existingProvider) {
      return res.status(404).json({
        success: false,
        message: 'Insurance provider not found'
      });
    }

    const provider = await prisma.insuranceProvider.update({
      where: { id },
      data: {
        isActive: !existingProvider.isActive
      }
    });

    const action = provider.isActive ? 'activated' : 'deactivated';
    console.log(`✅ Insurance provider ${action} successfully:`, provider.name);

    res.json({
      success: true,
      data: provider,
      message: `Insurance provider ${action} successfully`
    });

  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Insurance provider not found'
      });
    }
    handleError(res, 'Error toggling insurance provider status', error);
  }
};

export const getInsuranceProviderStats = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('📊 Getting insurance provider statistics:', id);

    const provider = await prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patients: true,
            attendances: true,
            bills: true,
            insuranceClaims: true
          }
        },
        bills: {
          select: {
            status: true,
            totalAmount: true,
            balance: true
          }
        },
        insuranceClaims: {
          select: {
            status: true,
            totalClaimAmount: true,
            approvedAmount: true
          }
        }
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Insurance provider not found'
      });
    }

    // Calculate financial statistics
    const totalBilling = provider.bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const pendingBalance = provider.bills.reduce((sum, bill) => sum + bill.balance, 0);
    const totalClaims = provider.insuranceClaims.reduce((sum, claim) => sum + claim.totalClaimAmount, 0);
    const approvedClaims = provider.insuranceClaims
      .filter(claim => claim.status === 'approved' || claim.status === 'paid')
      .reduce((sum, claim) => sum + (claim.approvedAmount || 0), 0);

    const stats = {
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        coveragePercentage: provider.coveragePercentage,
        isActive: provider.isActive
      },
      counts: {
        patients: provider._count.patients,
        attendances: provider._count.attendances,
        bills: provider._count.bills,
        insuranceClaims: provider._count.insuranceClaims
      },
      financials: {
        totalBilling,
        pendingBalance,
        totalClaims,
        approvedClaims
      },
      billStatus: {
        draft: provider.bills.filter(bill => bill.status === 'draft').length,
        pending: provider.bills.filter(bill => bill.status === 'pending').length,
        paid: provider.bills.filter(bill => bill.status === 'paid').length
      },
      claimStatus: {
        draft: provider.insuranceClaims.filter(claim => claim.status === 'draft').length,
        pending: provider.insuranceClaims.filter(claim => claim.status === 'pending').length,
        approved: provider.insuranceClaims.filter(claim => claim.status === 'approved').length,
        paid: provider.insuranceClaims.filter(claim => claim.status === 'paid').length
      }
    };

    console.log('✅ Insurance provider statistics fetched');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    handleError(res, 'Error fetching insurance provider statistics', error);
  }
};

export const getInsuranceTypes = async (req: AuthRequest, res: Response) => {
  try {
    const types = Object.values(InsuranceType);
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    handleError(res, 'Error fetching insurance types', error);
  }
};