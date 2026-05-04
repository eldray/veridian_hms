// controllers/wardController.ts - UPDATED (No Pricing Logic)
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getWards = async (req: Request, res: Response) => {
  try {
    const { isActive, wardType, hasAvailableBeds } = req.query;
    
    const where: any = {};
    
    // ✅ FIXED: Change isPending to isActive
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (wardType) {
      where.wardType = wardType as string;
    }
    
    if (hasAvailableBeds === 'true') {
      where.totalBeds = { gt: prisma.ward.fields.occupiedBeds };
    }

    const wards = await prisma.ward.findMany({
      where,
      include: {
        Bed: {
          select: {
            id: true,
            bedNumber: true,
            isOccupied: true,
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
              }
            }
          },
          orderBy: { bedNumber: 'asc' }
        },
        ServiceCatalog: {
          where: { 
            serviceType: 'ward',
            isActive: true // ✅ FIXED: Change isPending to isActive
          },
          select: {
            id: true,
            name: true,
            code: true,
            isNHISCovered: true,
            nhisServiceCode: true
          }
        },
        _count: {
          select: {
            Bed: true,
            Admission: {
              where: { status: 'admitted' }
            }
          }
        }
      },
      orderBy: { wardName: 'asc' }
    });

    // Enhance with availability information
    const wardsWithAvailability = wards.map(ward => ({
      ...ward,
      availableBeds: ward.totalBeds - ward.occupiedBeds,
      occupancyRate: ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0,
      hasPricing: ward.ServiceCatalog.length > 0
    }));

    res.json(wardsWithAvailability);
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ 
      message: 'Error fetching wards', 
      error: (error as Error).message 
    });
  }
};

export const getWardById = async (req: Request, res: Response) => {
  try {
    const ward = await prisma.ward.findUnique({
      where: { id: req.params.id },
      include: {
        Bed: {
          include: {
            Patient: {
              select: {
                id: true,
                surname: true,
                otherNames: true,
                folderNumber: true,
                gender: true,
                dateOfBirth: true
              }
            }
          },
          orderBy: { bedNumber: 'asc' }
        },
        ServiceCatalog: {
          where: { 
            serviceType: 'ward',
            isActive: true // ✅ FIXED: Change isPending to isActive
          },
          include: {
            User: {
              select: {
                fullName: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            Bed: true,
            Admission: {
              where: { status: 'admitted' }
            }
          }
        }
      }
    });

    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    const wardWithStats = {
      ...ward,
      availableBeds: ward.totalBeds - ward.occupiedBeds,
      occupancyRate: ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0,
      currentAdmissions: ward._count.Admission
    };

    res.json(wardWithStats);
  } catch (error) {
    console.error('Error fetching ward:', error);
    res.status(500).json({ 
      message: 'Error fetching ward', 
      error: (error as Error).message 
    });
  }
};

export const createWard = [
  body('wardName').notEmpty().withMessage('Ward name is required'),
  body('wardType').notEmpty().withMessage('Ward type is required'),
  body('totalBeds').isInt({ min: 1 }).withMessage('Total beds must be a positive number'),


  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        wardName,
        wardType,
        totalBeds
      } = req.body;

      // Check for duplicate ward name
      const existingWard = await prisma.ward.findFirst({
        where: {
          wardName: { equals: wardName, mode: 'insensitive' }
        }
      });

      if (existingWard) {
        return res.status(400).json({ 
          message: 'A ward with this name already exists' 
        });
      }

      const ward = await prisma.ward.create({
        data: {
          wardName,
          wardType,
          totalBeds: parseInt(totalBeds),
          occupiedBeds: 0,
          isPending: true
        }
      });

      // Create beds
      const bedPromises = [];
      for (let i = 1; i <= parseInt(totalBeds); i++) {
        bedPromises.push(
          prisma.bed.create({
            data: {
              bedNumber: i.toString(),
              wardId: ward.id,
              isOccupied: false
            }
          })
        );
      }

      await Promise.all(bedPromises);

      const createdWard = await prisma.ward.findUnique({
        where: { id: ward.id },
        include: {
          Bed: {
            select: {
              id: true,
              bedNumber: true,
              isOccupied: true
            },
            orderBy: { bedNumber: 'asc' }
          }
        }
      });
      // After creating the ward, create a service catalog entry for ward pricing
const serviceCatalog = await prisma.serviceCatalog.create({
  data: {
    name: `${wardName} - Daily Rate`,
    code: `WARD-${wardName.replace(/\s+/g, '_').toUpperCase()}`,
    serviceType: 'ward',
    serviceCategory: 'ipd',
    subType: wardType,
    wardId: ward.id,
    unit: 'Day',
    isActive: true,
    createdById: user.id
  }
});

// Create pricing for the service catalog
await prisma.servicePricing.create({
  data: {
    serviceCatalogId: serviceCatalog.id,
    cashPrice: 0,  // Will be set by admin
    nhisPrice: 0,
    insurancePrice: 0,
    effectiveDate: new Date(),
    isActive: true
  }
});
      res.status(201).json({
        message: 'Ward created successfully. Please add pricing via Service Catalog.',
        ward: createdWard,
        nextStep: 'Create a ward service item in Service Catalog for pricing'
      });
    } catch (error) {
      console.error('Error creating ward:', error);
      res.status(500).json({ 
        message: 'Error creating ward', 
        error: (error as Error).message 
      });
    }
  }
];

export const updateWard = [
  body('wardName').optional().notEmpty(),
  body('totalBeds').optional().isInt({ min: 1 }),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;

      const existingWard = await prisma.ward.findUnique({
        where: { id }
      });

      if (!existingWard) {
        return res.status(404).json({ message: 'Ward not found' });
      }

      // Check for duplicate ward name
      if (updateData.wardName && updateData.wardName !== existingWard.wardName) {
        const duplicateWard = await prisma.ward.findFirst({
          where: {
            wardName: { equals: updateData.wardName, mode: 'insensitive' },
            id: { not: id }
          }
        });

        if (duplicateWard) {
          return res.status(400).json({ 
            message: 'Another ward with this name already exists' 
          });
        }
      }

      const ward = await prisma.ward.update({
        where: { id },
        data: updateData
      });

      res.json(ward);
    } catch (error) {
      console.error('Error updating ward:', error);
      res.status(500).json({ 
        message: 'Error updating ward', 
        error: (error as Error).message 
      });
    }
  }
];

export const getAvailableBeds = async (req: Request, res: Response) => {
  try {
    const { wardType, wardId } = req.query;

    const where: any = {
      isOccupied: false
    };

    if (wardId) {
      where.wardId = wardId as string;
    }

    const availableBeds = await prisma.bed.findMany({
      where,
      include: {
        Ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { Ward: { wardName: 'asc' } },
        { bedNumber: 'asc' }
      ]
    });

    const filteredBeds = availableBeds.filter(bed => {
      const matchesType = wardType ? bed.Ward.wardType === wardType : true;
      const isWardActive = bed.Ward.isActive;
      return matchesType && isWardActive;
    });

    res.json({
      totalAvailableBeds: filteredBeds.length,
      availableBeds: filteredBeds.map(bed => ({
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        wardId: bed.Ward.id,
        wardName: bed.Ward.wardName,
        wardType: bed.Ward.wardType,
        isWardActive: bed.Ward.isActive
      })),
      byWard: Array.from(new Set(filteredBeds.map(bed => bed.wardId))).map(wardId => {
        const wardBeds = filteredBeds.filter(bed => bed.wardId === wardId);
        const sampleBed = wardBeds[0];
        return {
          wardId,
          wardName: sampleBed.Ward.wardName,
          wardType: sampleBed.Ward.wardType,
          availableBeds: wardBeds.length
        };
      })
    });
  } catch (error) {
    console.error('Error fetching available beds:', error);
    res.status(500).json({ 
      message: 'Error fetching available beds', 
      error: (error as Error).message 
    });
  }
};


// Keep deleteWard as is (no pricing changes needed)
export const deleteWard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ward = await prisma.ward.findUnique({
      where: { id }
    });

    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    if (ward.occupiedBeds > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete ward with occupied beds' 
      });
    }

    await prisma.ward.delete({
      where: { id }
    });

    res.json({ message: 'Ward deleted successfully' });
  } catch (error) {
    console.error('Error deleting ward:', error);
    res.status(500).json({ 
      message: 'Error deleting ward', 
      error: (error as Error).message 
    });
  }
};
