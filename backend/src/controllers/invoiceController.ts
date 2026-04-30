// controllers/invoiceController.ts - COMPLETED
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET ALL INVOICES
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { supplierName, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where: any = {};

    if (supplierName) {
      where.supplierName = {
        contains: supplierName as string,
        mode: 'insensitive'
      };
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          InvoiceItem: {
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
          StockTransaction: {
            include: {
              StockItem: {
                select: {
                  name: true,
                  drugCode: true
                }
              }
            }
          },
          User: {
            select: {
              fullName: true,
              username: true
            }
          }
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      invoices,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ 
      message: 'Error fetching invoices', 
      error: (error as Error).message 
    });
  }
};

// GET INVOICE BY ID
export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        InvoiceItem: {
          include: {
            StockItem: {
              select: {
                name: true,
                drugCode: true,
                unitOfMeasure: true,
                currentStock: true,
                costPrice: true
              }
            }
          }
        },
        StockTransaction: {
          include: {
            StockItem: {
              select: {
                name: true,
                drugCode: true
              }
            }
          }
        },
        User: {
          select: {
            fullName: true,
            username: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ 
      message: 'Error fetching invoice', 
      error: (error as Error).message 
    });
  }
};

// CREATE INVOICE
export const createInvoice = [
  body('invoiceNumber').notEmpty().withMessage('Invoice number is required'),
  body('supplierName').notEmpty().withMessage('Supplier name is required'),
  body('invoiceDate').isISO8601().withMessage('Valid invoice date is required'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be positive'),
  body('invoiceItems').isArray({ min: 1 }).withMessage('At least one invoice item is required'),
  body('invoiceItems.*.stockItemId').notEmpty().withMessage('Stock item ID is required'),
  body('invoiceItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('invoiceItems.*.unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be positive'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        invoiceNumber,
        supplierName,
        invoiceDate,
        totalAmount,
        invoiceItems,
        notes
      } = req.body;

      // Check if invoice number already exists
      const existingInvoice = await prisma.invoice.findUnique({
        where: { invoiceNumber }
      });

      if (existingInvoice) {
        return res.status(400).json({ message: 'Invoice number already exists' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            supplierName,
            invoiceDate: new Date(invoiceDate),
            totalAmount: parseFloat(totalAmount),
            notes,
            createdById: (req as any).user?.id
          }
        });

        // Create invoice items and stock transactions
        for (const item of invoiceItems) {
          const stockItem = await tx.stockItem.findUnique({
            where: { id: item.stockItemId }
          });

          if (!stockItem) {
            throw new Error(`Stock item not found: ${item.stockItemId}`);
          }

          // Create invoice item
          await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              stockItemId: item.stockItemId,
              quantity: parseInt(item.quantity),
              unitCost: parseFloat(item.unitCost),
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
            }
          });

          // Create stock transaction for purchase
          const newStockLevel = stockItem.currentStock + parseInt(item.quantity);

          await tx.stockTransaction.create({
            data: {
              stockItemId: item.stockItemId,
              transactionType: 'purchase',
              quantity: parseInt(item.quantity),
              balanceAfter: newStockLevel,
              reference: invoiceNumber,
              invoiceId: invoice.id,
              performedBy: (req as any).user?.id || 'system'
            }
          });

          // Update stock item
          await tx.stockItem.update({
            where: { id: item.stockItemId },
            data: { 
              currentStock: newStockLevel,
              costPrice: parseFloat(item.unitCost) // Update cost price
            }
          });
        }

        return await tx.invoice.findUnique({
          where: { id: invoice.id },
          include: {
            InvoiceItem: {
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
      });

      res.status(201).json({
        message: 'Invoice created successfully',
        invoice: result
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ 
        message: 'Error creating invoice', 
        error: (error as Error).message 
      });
    }
  }
];

// UPDATE INVOICE (Limited - only notes and basic info, not items)
export const updateInvoice = [
  body('supplierName').optional().notEmpty().withMessage('Supplier name cannot be empty'),
  body('invoiceDate').optional().isISO8601().withMessage('Valid invoice date is required'),
  body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be positive'),
  body('notes').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { supplierName, invoiceDate, totalAmount, notes } = req.body;

      // Check if invoice exists
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id }
      });

      if (!existingInvoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      // Prepare update data
      const updateData: any = {};
      if (supplierName) updateData.supplierName = supplierName;
      if (invoiceDate) updateData.invoiceDate = new Date(invoiceDate);
      if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
      if (notes !== undefined) updateData.notes = notes;

      updateData.updatedAt = new Date();

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
          InvoiceItem: {
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
        message: 'Invoice updated successfully',
        invoice
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ 
        message: 'Error updating invoice', 
        error: (error as Error).message 
      });
    }
  }
];

// DELETE INVOICE (With caution - reverses stock transactions)
export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // Get invoice with items and stock transactions
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: {
          invoiceItems: {
            include: {
              stockItem: true
            }
          },
          stockTransactions: true
        }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Reverse stock transactions and update stock levels
      for (const transaction of invoice.stockTransactions) {
        const stockItem = await tx.stockItem.findUnique({
          where: { id: transaction.stockItemId }
        });

        if (stockItem) {
          // Calculate new stock level after reversal
          const newStockLevel = stockItem.currentStock - transaction.quantity;
          
          await tx.stockItem.update({
            where: { id: transaction.stockItemId },
            data: { currentStock: newStockLevel }
          });
        }

        // Delete the stock transaction
        await tx.stockTransaction.delete({
          where: { id: transaction.id }
        });
      }

      // Delete invoice items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      });

      // Delete invoice
      await tx.invoice.delete({
        where: { id }
      });

      return invoice;
    });

    res.json({
      message: 'Invoice deleted successfully (stock levels reversed)',
      deletedInvoice: {
        id: result.id,
        invoiceNumber: result.invoiceNumber,
        supplierName: result.supplierName
      }
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ 
      message: 'Error deleting invoice', 
      error: (error as Error).message 
    });
  }
};

// GET SUPPLIERS LIST
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.invoice.findMany({
      distinct: ['supplierName'],
      select: {
        supplierName: true
      },
      where: {
        supplierName: {
          not: null
        }
      },
      orderBy: {
        supplierName: 'asc'
      }
    });

    const supplierList = suppliers.map(item => item.supplierName).filter(Boolean);
    
    res.json(supplierList);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ 
      message: 'Error fetching suppliers', 
      error: (error as Error).message 
    });
  }
};

// GET INVOICE STATISTICS
export const getInvoiceStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }

    const [
      totalInvoices,
      totalAmount,
      recentInvoices,
      topSuppliers
    ] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where,
        _sum: {
          totalAmount: true
        }
      }),
      prisma.invoice.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.invoice.groupBy({
        by: ['supplierName'],
        where,
        _sum: {
          totalAmount: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            totalAmount: 'desc'
          }
        },
        take: 10
      })
    ]);

    const stats = {
      totalInvoices,
      totalAmount: totalAmount._sum.totalAmount || 0,
      recentInvoices,
      topSuppliers: topSuppliers.map(supplier => ({
        supplierName: supplier.supplierName,
        totalAmount: supplier._sum.totalAmount,
        invoiceCount: supplier._count.id
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ 
      message: 'Error fetching invoice stats', 
      error: (error as Error).message 
    });
  }
};