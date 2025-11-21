// controllers/bedController.ts - SIMPLIFIED
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getBeds = async (req: Request, res: Response) => {
  try {
    const beds = await prisma.bed.findMany({
      include: {
        ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true,
            isActive: true // ✅ ADDED: Include ward active status
          }
        },
        currentPatient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true,
          }
        }
      },
      orderBy: [
        { wardId: "asc" },
        { bedNumber: "asc" }
      ]
    });

    res.json(beds);
  } catch (error) {
    console.error('Error fetching beds:', error);
    res.status(500).json({ 
      message: 'Error fetching beds', 
      error: (error as Error).message 
    });
  }
};

export const getBedById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const bed = await prisma.bed.findUnique({
      where: { id },
      include: {
        ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true
          }
        },
        currentPatient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true
          }
        }
      }
    });

    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    res.json(bed);
  } catch (error) {
    console.error('Error fetching bed:', error);
    res.status(500).json({ 
      message: 'Error fetching bed', 
      error: (error as Error).message 
    });
  }
};

export const createBed = [
  body('wardId').notEmpty().withMessage('Ward ID is required'),
  body('bedNumber').notEmpty().withMessage('Bed number is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { wardId, bedNumber } = req.body;

      // Check if ward exists
      const ward = await prisma.ward.findUnique({
        where: { id: wardId }
      });

      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }

      // Check if bed number already exists in the same ward
      const existingBed = await prisma.bed.findFirst({
        where: {
          wardId,
          bedNumber: bedNumber.trim()
        }
      });

      if (existingBed) {
        return res.status(400).json({ 
          message: `Bed number ${bedNumber} already exists in this ward` 
        });
      }

      const bed = await prisma.bed.create({
        data: {
          wardId,
          bedNumber: bedNumber.trim(),
          isOccupied: false
        },
        include: {
          ward: {
            select: {
              id: true,
              wardName: true,
              wardType: true
            }
          }
        }
      });

      // Update ward bed count
      await prisma.ward.update({
        where: { id: wardId },
        data: {
          totalBeds: { increment: 1 }
        }
      });

      res.status(201).json(bed);
    } catch (error) {
      console.error('Error creating bed:', error);
      res.status(500).json({ 
        message: 'Error creating bed', 
        error: (error as Error).message 
      });
    }
  }
];

export const updateBed = [
  body('isOccupied').optional().isBoolean(),
  body('bedNumber').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { isOccupied, bedNumber } = req.body;

      const existingBed = await prisma.bed.findUnique({
        where: { id },
        include: { ward: true }
      });

      if (!existingBed) {
        return res.status(404).json({ message: 'Bed not found' });
      }

      // Check for duplicate bed number
      if (bedNumber && bedNumber !== existingBed.bedNumber) {
        const duplicateBed = await prisma.bed.findFirst({
          where: {
            wardId: existingBed.wardId,
            bedNumber: bedNumber.trim(),
            id: { not: id }
          }
        });

        if (duplicateBed) {
          return res.status(400).json({ 
            message: `Bed number ${bedNumber} already exists in this ward` 
          });
        }
      }

      const bed = await prisma.bed.update({
        where: { id },
        data: {
          bedNumber: bedNumber?.trim(),
          isOccupied
        },
        include: {
          ward: {
            select: {
              id: true,
              wardName: true,
              wardType: true
            }
          }
        }
      });

      res.json(bed);
    } catch (error) {
      console.error('Error updating bed:', error);
      res.status(500).json({ 
        message: 'Error updating bed', 
        error: (error as Error).message 
      });
    }
  }
];

export const deleteBed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const bed = await prisma.bed.findUnique({
      where: { id },
      include: { ward: true }
    });

    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    if (bed.isOccupied) {
      return res.status(400).json({ 
        message: 'Cannot delete occupied bed' 
      });
    }

    await prisma.bed.delete({
      where: { id }
    });

    // Update ward bed count
    await prisma.ward.update({
      where: { id: bed.wardId },
      data: {
        totalBeds: { decrement: 1 }
      }
    });

    res.json({ message: 'Bed deleted successfully' });
  } catch (error) {
    console.error('Error deleting bed:', error);
    res.status(500).json({ 
      message: 'Error deleting bed', 
      error: (error as Error).message 
    });
  }
};