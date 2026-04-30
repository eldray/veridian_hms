// controllers/requisitionController.ts - COMPLETE FIXED VERSION
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET ALL REQUISITIONS
export const getRequisitions = async (req: Request, res: Response) => {
  try {
    const { departmentId, status, urgency, page = 1, limit = 50 } = req.query;

    const where: any = {};

    if (departmentId) where.requestingDepartmentId = departmentId as string;
    if (status) where.status = status as string;
    if (urgency) where.urgency = urgency as string;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [requisitions, total] = await Promise.all([
      prisma.requisition.findMany({
        where,
        include: {
          departments: {
            select: { name: true, id: true }
          },
          User_Requisition_requestedByIdToUser: {
            select: { fullName: true, role: true, id: true }
          },
          User_Requisition_approvedByIdToUser: {
            select: { fullName: true, role: true }
          },
          User_Requisition_fulfilledByIdToUser: {
            select: { fullName: true, role: true }
          },
          RequisitionItem: {
            include: {
              StockItem: {
                select: {
                  id: true,
                  name: true,
                  drugCode: true,
                  unitOfMeasure: true,
                  currentStock: true,
                  reorderLevel: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.requisition.count({ where })
    ]);

    res.json({
      requisitions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ 
      message: 'Error fetching requisitions', 
      error: (error as Error).message 
    });
  }
};

// GET REQUISITION BY ID
export const getRequisitionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const requisition = await prisma.requisition.findUnique({
      where: { id },
      include: {
        departments: {
          select: { name: true, id: true }
        },
        User_Requisition_requestedByIdToUser: {
          select: { fullName: true, role: true, username: true }
        },
        User_Requisition_approvedByIdToUser: {
          select: { fullName: true, role: true }
        },
        User_Requisition_fulfilledByIdToUser: {
          select: { fullName: true, role: true }
        },
        RequisitionItem: {
          include: {
            StockItem: {
              select: {
                id: true,
                name: true,
                drugCode: true,
                unitOfMeasure: true,
                currentStock: true,
                reorderLevel: true,
                costPrice: true
              }
            }
          }
        }
      }
    });

    if (!requisition) {
      return res.status(404).json({ message: 'Requisition not found' });
    }

    res.json(requisition);
  } catch (error) {
    console.error('Error fetching requisition:', error);
    res.status(500).json({ 
      message: 'Error fetching requisition', 
      error: (error as Error).message 
    });
  }
};

// CREATE REQUISITION
export const createRequisition = [
  body('requestingDepartmentId').notEmpty().withMessage('Department ID is required'),
  body('urgency').isIn(['routine', 'urgent', 'emergency']).withMessage('Valid urgency is required'),
  body('requisitionItems').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('requisitionItems.*.stockItemId').notEmpty().withMessage('Stock item ID is required'),
  body('requisitionItems.*.quantityRequested').isInt({ min: 1 }).withMessage('Quantity must be positive'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        requestingDepartmentId,
        purpose,
        urgency,
        requiredDate,
        requisitionItems,
        notes
      } = req.body;

      // Generate requisition number
      const requisitionCount = await prisma.requisition.count();
      const requisitionNumber = `REQ-${(requisitionCount + 1).toString().padStart(6, '0')}`;

      const requisition = await prisma.requisition.create({
        data: {
          requisitionNumber,
          requestingDepartmentId,
          purpose: purpose || null,
          urgency,
          requiredDate: requiredDate ? new Date(requiredDate) : null,
          notes: notes || null,
          requestedById: (req as any).user?.id,
          status: 'draft',
          RequisitionItem: {
            create: requisitionItems.map((item: any) => ({
              stockItemId: item.stockItemId,
              quantityRequested: parseInt(item.quantityRequested),
              purpose: item.purpose || null,
              notes: item.notes || null
            }))
          }
        },
        include: {
          RequisitionItem: {
            include: {
              StockItem: {
                select: {
                  name: true,
                  drugCode: true,
                  unitOfMeasure: true
                }
              }
            }
          },
          departments: {
            select: { name: true }
          },
          User_Requisition_requestedByIdToUser: {
            select: { fullName: true }
          }
        }
      });

      res.status(201).json({
        message: 'Requisition created successfully',
        requisition
      });
    } catch (error) {
      console.error('Error creating requisition:', error);
      res.status(500).json({ 
        message: 'Error creating requisition', 
        error: (error as Error).message 
      });
    }
  }
];

// UPDATE REQUISITION STATUS
export const updateRequisitionStatus = [
  body('status').isIn(['draft', 'submitted', 'approved', 'fulfilled', 'cancelled']).withMessage('Valid status is required'),
  body('notes').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      const existingRequisition = await prisma.requisition.findUnique({
        where: { id }
      });

      if (!existingRequisition) {
        return res.status(404).json({ message: 'Requisition not found' });
      }

      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'submitted') {
        // No additional fields needed
      } else if (status === 'approved') {
        updateData.approvedById = (req as any).user?.id;
        updateData.approvedAt = new Date();
      } else if (status === 'fulfilled') {
        updateData.fulfilledById = (req as any).user?.id;
        updateData.fulfilledAt = new Date();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const requisition = await prisma.requisition.update({
        where: { id },
        data: updateData,
        include: {
          departments: {
            select: { name: true }
          },
          User_Requisition_requestedByIdToUser: {
            select: { fullName: true }
          },
          User_Requisition_approvedByIdToUser: {
            select: { fullName: true }
          },
          RequisitionItem: {
            include: {
              StockItem: {
                select: {
                  name: true,
                  drugCode: true,
                  unitOfMeasure: true
                }
              }
            }
          }
        }
      });

      res.json({
        message: `Requisition status updated to ${status}`,
        requisition
      });
    } catch (error) {
      console.error('Error updating requisition status:', error);
      res.status(500).json({ 
        message: 'Error updating requisition status', 
        error: (error as Error).message 
      });
    }
  }
];

// DELETE REQUISITION
export const deleteRequisition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingRequisition = await prisma.requisition.findUnique({
      where: { id }
    });

    if (!existingRequisition) {
      return res.status(404).json({ message: 'Requisition not found' });
    }

    if (existingRequisition.status !== 'draft') {
      return res.status(400).json({ 
        message: 'Only draft requisitions can be deleted' 
      });
    }

    // Delete requisition items first
    await prisma.requisitionItem.deleteMany({
      where: { requisitionId: id }
    });

    // Then delete requisition
    await prisma.requisition.delete({
      where: { id }
    });

    res.json({ 
      message: 'Requisition deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting requisition:', error);
    res.status(500).json({ 
      message: 'Error deleting requisition', 
      error: (error as Error).message 
    });
  }
};

// APPROVE REQUISITION ITEMS
export const approveRequisitionItems = [
  body('approvedItems').isArray({ min: 1 }).withMessage('At least one approved item is required'),
  body('approvedItems.*.requisitionItemId').notEmpty().withMessage('Requisition item ID is required'),
  body('approvedItems.*.quantityApproved').isInt({ min: 0 }).withMessage('Quantity approved must be non-negative'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { approvedItems } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const requisition = await tx.requisition.findUnique({
          where: { id }
        });

        if (!requisition) {
          throw new Error('Requisition not found');
        }

        if (requisition.status !== 'submitted') {
          throw new Error('Only submitted requisitions can be approved');
        }

        for (const item of approvedItems) {
          await tx.requisitionItem.update({
            where: { id: item.requisitionItemId },
            data: {
              quantityApproved: parseInt(item.quantityApproved),
              notes: item.notes || null
            }
          });
        }

        const updatedRequisition = await tx.requisition.update({
          where: { id },
          data: {
            status: 'approved',
            approvedById: (req as any).user?.id,
            approvedAt: new Date()
          },
          include: {
            RequisitionItem: {
              include: {
                StockItem: {
                  select: {
                    name: true,
                    drugCode: true,
                    unitOfMeasure: true
                  }
                }
              }
            }
          }
        });

        return updatedRequisition;
      });

      res.json({
        message: 'Requisition items approved successfully',
        requisition: result
      });
    } catch (error) {
      console.error('Error approving requisition items:', error);
      res.status(500).json({ 
        message: 'Error approving requisition items', 
        error: (error as Error).message 
      });
    }
  }
];

// UPDATE REQUISITION (Basic info only)
export const updateRequisition = [
  body('purpose').optional().isString(),
  body('urgency').optional().isIn(['routine', 'urgent', 'emergency']),
  body('notes').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { purpose, urgency, notes } = req.body;

      const existingRequisition = await prisma.requisition.findUnique({
        where: { id }
      });

      if (!existingRequisition) {
        return res.status(404).json({ message: 'Requisition not found' });
      }

      if (existingRequisition.status !== 'draft') {
        return res.status(400).json({ 
          message: 'Only draft requisitions can be updated' 
        });
      }

      const requisition = await prisma.requisition.update({
        where: { id },
        data: {
          purpose: purpose !== undefined ? purpose : existingRequisition.purpose,
          urgency: urgency || existingRequisition.urgency,
          notes: notes !== undefined ? notes : existingRequisition.notes,
          updatedAt: new Date()
        },
        include: {
          departments: {
            select: { name: true }
          },
          RequisitionItem: {
            include: {
              StockItem: {
                select: {
                  name: true,
                  drugCode: true,
                  unitOfMeasure: true
                }
              }
            }
          }
        }
      });

      res.json({
        message: 'Requisition updated successfully',
        requisition
      });
    } catch (error) {
      console.error('Error updating requisition:', error);
      res.status(500).json({ 
        message: 'Error updating requisition', 
        error: (error as Error).message 
      });
    }
  }
];