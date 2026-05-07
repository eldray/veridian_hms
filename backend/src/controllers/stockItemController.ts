// controllers/stockItemController.ts - FIXED
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStockItems = async (req: Request, res: Response) => {
  try {
    const { category, isActive, isMedication } = req.query;
    const where: any = {};
    
    if (category) where.category = category as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isMedication !== undefined) where.isMedication = isMedication === 'true';

    const items = await prisma.stockItem.findMany({
      where,
   orderBy: {
        name: 'asc'
      }
    });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching stock items:', error);
    res.status(500).json({ message: 'Error fetching stock items', error });
  }
};


// Add to stockItemController.ts

// Get stock value summary
export const getStockValueSummary = async (req: Request, res: Response) => {
  try {
    const stockItems = await prisma.stockItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        currentStock: true,
        costPrice: true,
        reorderLevel: true,
        expiryDate: true,
        isMedication: true
      }
    });

    const summary = {
      totalItems: stockItems.length,
      medications: stockItems.filter(i => i.isMedication).length,
      totalValue: stockItems.reduce((sum, i) => sum + (i.costPrice || 0) * i.currentStock, 0),
      lowStockItems: stockItems.filter(i => i.currentStock <= i.reorderLevel).length,
      outOfStockItems: stockItems.filter(i => i.currentStock === 0).length,
      expiringSoon: stockItems.filter(i => {
        if (!i.expiryDate) return false;
        const expiry = new Date(i.expiryDate);
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        return expiry <= thirtyDays && expiry >= new Date();
      }).length,
      byCategory: stockItems.reduce((acc, item) => {
        const cat = item.category || 'other';
        if (!acc[cat]) {
          acc[cat] = { count: 0, value: 0 };
        }
        acc[cat].count++;
        acc[cat].value += (item.costPrice || 0) * item.currentStock;
        return acc;
      }, {} as Record<string, { count: number; value: number }>)
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting stock value summary:', error);
    res.status(500).json({ message: 'Error getting stock summary', error });
  }
};

// Get expiry report
export const getExpiryReport = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string);
    
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysNum);

    const stockItems = await prisma.stockItem.findMany({
      where: {
        expiryDate: {
          not: null
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        category: true,
        currentStock: true,
        expiryDate: true,
        unitOfMeasure: true,
        costPrice: true
      },
      orderBy: {
        expiryDate: 'asc'
      }
    });

    const expiringSoon = stockItems.filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return expiry >= today && expiry <= futureDate;
    });

    const expired = stockItems.filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return expiry < today;
    });

    const healthy = stockItems.filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return expiry > futureDate;
    });

    res.json({
      summary: {
        totalWithExpiry: stockItems.length,
        expiringSoon: expiringSoon.length,
        expired: expired.length,
        healthy: healthy.length,
        expiringValue: expiringSoon.reduce((sum, i) => sum + (i.costPrice || 0) * i.currentStock, 0)
      },
      expiringSoon: expiringSoon.slice(0, 50),
      expired: expired.slice(0, 50),
      reportPeriod: daysNum
    });
  } catch (error) {
    console.error('Error getting expiry report:', error);
    res.status(500).json({ message: 'Error getting expiry report', error });
  }
};

// Get movement summary
export const getMovementSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        StockItem: {
          select: {
            name: true,
            category: true
          }
        }
      }
    });

    const byType = {
      purchase: transactions.filter(t => t.transactionType === 'purchase'),
      sale: transactions.filter(t => t.transactionType === 'sale'),
      requisition: transactions.filter(t => t.transactionType === 'requisition'),
      adjustment: transactions.filter(t => t.transactionType === 'adjustment')
    };

    // Top moving items
    const itemMovement = transactions.reduce((acc, t) => {
      const name = t.StockItem?.name || 'Unknown';
      if (!acc[name]) {
        acc[name] = { name, quantity: 0, type: t.transactionType };
      }
      acc[name].quantity += t.quantity;
      return acc;
    }, {} as Record<string, { name: string; quantity: number; type: string }>);

    const summary = {
      period: { startDate: startDate || null, endDate: endDate || null },
      totalTransactions: transactions.length,
      totalIn: byType.purchase.reduce((sum, t) => sum + t.quantity, 0),
      totalOut: [...byType.sale, ...byType.requisition].reduce((sum, t) => sum + t.quantity, 0),
      byType: {
        purchases: byType.purchase.length,
        purchaseQuantity: byType.purchase.reduce((sum, t) => sum + t.quantity, 0),
        sales: byType.sale.length,
        saleQuantity: byType.sale.reduce((sum, t) => sum + t.quantity, 0),
        requisitions: byType.requisition.length,
        requisitionQuantity: byType.requisition.reduce((sum, t) => sum + t.quantity, 0),
        adjustments: byType.adjustment.length,
        adjustmentQuantity: byType.adjustment.reduce((sum, t) => sum + t.quantity, 0)
      },
      topMovements: Object.values(itemMovement)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting movement summary:', error);
    res.status(500).json({ message: 'Error getting movement summary', error });
  }
};

// Get usage report (most dispensed items)
export const getUsageReport = async (req: Request, res: Response) => {
  try {
    const { period = 'month', limit = 20 } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const sales = await prisma.stockTransaction.findMany({
      where: {
        transactionType: 'sale',
        transactionDate: { gte: startDate }
      },
      include: {
        StockItem: {
          select: {
            name: true,
            category: true,
            unitOfMeasure: true
          }
        }
      }
    });

    const requisitions = await prisma.stockTransaction.findMany({
      where: {
        transactionType: 'requisition',
        transactionDate: { gte: startDate }
      },
      include: {
        StockItem: {
          select: {
            name: true,
            category: true,
            unitOfMeasure: true
          }
        }
      }
    });

    // Aggregate by item
    const itemUsage = [...sales, ...requisitions].reduce((acc, t) => {
      const name = t.StockItem?.name || 'Unknown';
      if (!acc[name]) {
        acc[name] = {
          name,
          category: t.StockItem?.category || 'other',
          unit: t.StockItem?.unitOfMeasure || 'unit',
          quantity: 0,
          transactions: 0
        };
      }
      acc[name].quantity += t.quantity;
      acc[name].transactions++;
      return acc;
    }, {} as Record<string, any>);

    const results = Object.values(itemUsage)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, parseInt(limit as string));

    res.json({
      period,
      startDate,
      summary: {
        totalItemsDispensed: results.length,
        totalQuantity: results.reduce((sum, i) => sum + i.quantity, 0),
        topItem: results[0] || null
      },
      topItems: results
    });
  } catch (error) {
    console.error('Error getting usage report:', error);
    res.status(500).json({ message: 'Error getting usage report', error });
  }
};

// Get supplier report
export const getSupplierReport = async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        InvoiceItem: {
          include: {
            StockItem: {
              select: {
                name: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { invoiceDate: 'desc' }
    });

    const supplierSummary = invoices.reduce((acc, inv) => {
      if (!acc[inv.supplierName]) {
        acc[inv.supplierName] = {
          name: inv.supplierName,
          totalSpent: 0,
          invoiceCount: 0,
          itemCount: 0,
          lastOrderDate: inv.invoiceDate
        };
      }
      acc[inv.supplierName].totalSpent += inv.totalAmount;
      acc[inv.supplierName].invoiceCount++;
      acc[inv.supplierName].itemCount += inv.InvoiceItem?.length || 0;
      if (new Date(inv.invoiceDate) > new Date(acc[inv.supplierName].lastOrderDate)) {
        acc[inv.supplierName].lastOrderDate = inv.invoiceDate;
      }
      return acc;
    }, {} as Record<string, any>);

    const suppliers = Object.values(supplierSummary);
    const totalSpent = suppliers.reduce((sum, s: any) => sum + s.totalSpent, 0);

    res.json({
      summary: {
        totalSuppliers: suppliers.length,
        totalSpent,
        averageSpent: suppliers.length > 0 ? totalSpent / suppliers.length : 0,
        totalInvoices: invoices.length
      },
      suppliers: suppliers.sort((a: any, b: any) => b.totalSpent - a.totalSpent)
    });
  } catch (error) {
    console.error('Error getting supplier report:', error);
    res.status(500).json({ message: 'Error getting supplier report', error });
  }
};

// Get requisition summary report
export const getRequisitionSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const requisitions = await prisma.requisition.findMany({
      where,
      include: {
        RequisitionItem: true,
        departments: {
          select: { name: true }
        }
      }
    });

    const byStatus = {
      draft: requisitions.filter(r => r.status === 'draft').length,
      submitted: requisitions.filter(r => r.status === 'submitted').length,
      approved: requisitions.filter(r => r.status === 'approved').length,
      fulfilled: requisitions.filter(r => r.status === 'fulfilled').length,
      cancelled: requisitions.filter(r => r.status === 'cancelled').length
    };

    const byUrgency = {
      routine: requisitions.filter(r => r.urgency === 'routine').length,
      urgent: requisitions.filter(r => r.urgency === 'urgent').length,
      emergency: requisitions.filter(r => r.urgency === 'emergency').length
    };

    const fulfillmentRate = requisitions.length > 0 
      ? (byStatus.fulfilled / requisitions.length * 100).toFixed(1)
      : 0;

    // Department summary
    const byDepartment = requisitions.reduce((acc, r) => {
      const deptName = r.departments?.name || 'Unknown';
      if (!acc[deptName]) {
        acc[deptName] = { total: 0, fulfilled: 0, items: 0 };
      }
      acc[deptName].total++;
      if (r.status === 'fulfilled') acc[deptName].fulfilled++;
      acc[deptName].items += r.RequisitionItem?.length || 0;
      return acc;
    }, {} as Record<string, any>);

    res.json({
      summary: {
        total: requisitions.length,
        byStatus,
        byUrgency,
        fulfillmentRate: `${fulfillmentRate}%`,
        averageItemsPerRequisition: requisitions.length > 0 
          ? requisitions.reduce((sum, r) => sum + (r.RequisitionItem?.length || 0), 0) / requisitions.length 
          : 0
      },
      byDepartment: Object.entries(byDepartment).map(([name, data]) => ({ name, ...data as any })),
      recentRequisitions: requisitions.slice(0, 20).map(r => ({
        id: r.id,
        requisitionNumber: r.requisitionNumber,
        status: r.status,
        urgency: r.urgency,
        createdAt: r.createdAt,
        itemCount: r.RequisitionItem?.length || 0
      }))
    });
  } catch (error) {
    console.error('Error getting requisition summary:', error);
    res.status(500).json({ message: 'Error getting requisition summary', error });
  }
};

export const getStockItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const item = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        Medication: {
          include: {
            Attendance: {
              select: {
                attendanceNumber: true,
                Patient: {
                  select: {
                    surname: true,
                    otherNames: true
                  }
                }
              }
            }
          }
        },
        StockTransaction: {
          orderBy: { transactionDate: 'desc' },
          take: 10
        },
        InvoiceItem: {
          include: {
            Invoice: {
              select: {
                invoiceNumber: true,
                supplierName: true
              }
            }
          }
        },
        RequisitionItem: {
          include: {
            Requisition: {
              select: {
                requisitionNumber: true,
                status: true
              }
            }
          }
        },
        // ✅ CORRECT: Use StockBatch (capital S, capital B) if you need batches
        StockBatch: {
          orderBy: { receivedDate: 'desc' }
        }
      }
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Stock item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching stock item:', error);
    res.status(500).json({ message: 'Error fetching stock item', error });
  }
};

// Rest of the controller remains the same...
export const createStockItem = [
  body('name').notEmpty().withMessage('Item name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('unitOfMeasure').notEmpty().withMessage('Unit of measure is required'),
  body('strength').optional().isString(),
  body('reorderLevel').isInt({ min: 0 }).withMessage('Reorder level must be a non-negative number'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a non-negative number'),
  body('drugCode').optional().isString(),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const itemData = {
        name: req.body.name,
        description: req.body.description || null,
        category: req.body.category,
        strength: req.body.strength || null,
        unitOfMeasure: req.body.unitOfMeasure,
        drugCode: req.body.drugCode || null,
        reorderLevel: parseInt(req.body.reorderLevel),
        costPrice: parseFloat(req.body.costPrice),
        currentStock: req.body.currentStock ? parseInt(req.body.currentStock) : 0,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        isMedication: req.body.isMedication !== undefined ? req.body.isMedication : true,
        supplier: req.body.supplier || null,
        batchNumber: req.body.batchNumber || null,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
      };

      const item = await prisma.stockItem.create({
        data: itemData
      });
      
      // If batchNumber provided, also create a StockBatch record
      if (req.body.batchNumber && req.body.expiryDate) {
        await prisma.stockBatch.create({
          data: {
            stockItemId: item.id,
            batchNumber: req.body.batchNumber,
            expiryDate: new Date(req.body.expiryDate),
            quantity: item.currentStock,
            costPrice: item.costPrice,
            receivedDate: new Date()
          }
        });
      }
      
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating stock item:', error);
      res.status(500).json({ message: 'Error creating stock item', error });
    }
  }
];

export const updateStockItem = [
  body('name').optional().notEmpty().withMessage('Item name cannot be empty'),
  body('reorderLevel').optional().isInt({ min: 0 }).withMessage('Reorder level must be a non-negative number'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be a non-negative number'),
  body('currentStock').optional().isInt({ min: 0 }).withMessage('Current stock must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      
      const existingItem = await prisma.stockItem.findUnique({
        where: { id }
      });
      
      if (!existingItem) {
        return res.status(404).json({ message: 'Stock item not found' });
      }

      const updateData: any = { ...req.body };
      
      if (req.body.reorderLevel !== undefined) updateData.reorderLevel = parseInt(req.body.reorderLevel);
      if (req.body.costPrice !== undefined) updateData.costPrice = parseFloat(req.body.costPrice);
      if (req.body.currentStock !== undefined) updateData.currentStock = parseInt(req.body.currentStock);
      if (req.body.expiryDate !== undefined) updateData.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;

      const item = await prisma.stockItem.update({
        where: { id },
        data: updateData
      });
      
      res.json(item);
    } catch (error) {
      console.error('Error updating stock item:', error);
      res.status(500).json({ message: 'Error updating stock item', error });
    }
  }
];

export const deleteStockItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existingItem = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        Medication: { take: 1 },
        StockTransaction: { take: 1 },
        InvoiceItem: { take: 1 },
        RequisitionItem: { take: 1 }
      }
    });
    
    if (!existingItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    if (existingItem.Medication.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated medications' 
      });
    }

    if (existingItem.StockTransaction.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated stock transactions' 
      });
    }

    if (existingItem.InvoiceItem.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated invoice items' 
      });
    }

    if (existingItem.RequisitionItem.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated requisition items' 
      });
    }

    await prisma.stockItem.delete({
      where: { id }
    });

    res.json({ message: 'Stock item deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock item:', error);
    res.status(500).json({ message: 'Error deleting stock item', error });
  }
};

export const getLowStockItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.stockItem.findMany({
      where: {
        currentStock: {
          lte: prisma.stockItem.fields.reorderLevel
        },
        isActive: true
      },
      orderBy: {
        currentStock: 'asc'
      }
    });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ message: 'Error fetching low stock items', error });
  }
};

export const getStockCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.stockItem.findMany({
      distinct: ['category'],
      select: {
        category: true
      },
      where: {
        category: {
          not: null
        }
      }
    });
    
    const categoryList = categories.map(item => item.category).filter(Boolean);
    res.json(categoryList);
  } catch (error) {
    console.error('Error fetching stock categories:', error);
    res.status(500).json({ message: 'Error fetching stock categories', error });
  }
};

export const updateStockLevel = [
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('transactionType').isIn(['purchase', 'adjustment', 'requisition', 'sale']).withMessage('Valid transaction type required'),
  body('reference').optional().isString(),
  body('notes').optional().isString(),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { quantity, transactionType, reference, notes } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const stockItem = await tx.stockItem.findUnique({
          where: { id }
        });

        if (!stockItem) {
          throw new Error('Stock item not found');
        }

        let newStock = stockItem.currentStock;
        if (transactionType === 'purchase' || transactionType === 'adjustment') {
          newStock += quantity;
        } else if (transactionType === 'sale' || transactionType === 'requisition') {
          newStock -= quantity;
        }

        if (newStock < 0) {
          throw new Error('Insufficient stock for this transaction');
        }

        const updatedItem = await tx.stockItem.update({
          where: { id },
          data: { currentStock: newStock }
        });
        
        await tx.stockTransaction.create({
          data: {
            stockItemId: id,
            transactionType,
            quantity: Math.abs(quantity),
            balanceAfter: newStock,
            reference,
            notes,
            performedBy: (req as any).user?.id || 'system'
          }
        });

        return updatedItem;
      });

      res.json({
        message: 'Stock level updated successfully',
        item: result
      });
    } catch (error) {
      console.error('Error updating stock level:', error);
      res.status(500).json({ 
        message: 'Error updating stock level', 
        error: (error as Error).message 
      });
    }
  }
];

export const getStockTransactions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where: { stockItemId: id },
        include: {
          Requisition: {
            select: {
              requisitionNumber: true,
              status: true
            }
          },
          Invoice: {
            select: {
              invoiceNumber: true,
              supplierName: true
            }
          }
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.stockTransaction.count({
        where: { stockItemId: id }
      })
    ]);

    res.json({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching stock transactions:', error);
    res.status(500).json({ message: 'Error fetching stock transactions', error });
  }
};

export const getMedicationsByStockItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const medications = await prisma.medication.findMany({
      where: { stockItemId: id },
      include: {
        Attendance: {
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
              }
            }
          }
        },
        ServiceCatalog: {
          include: { pricing: true }
        }
      },
      orderBy: { prescribedAt: 'desc' },
      take: 50
    });
    
    const summary = {
      totalPrescribed: medications.length,
      dispensed: medications.filter(m => m.status === 'dispensed').length,
      administered: medications.filter(m => m.status === 'administered').length,
      cancelled: medications.filter(m => m.status === 'cancelled').length,
      pending: medications.filter(m => m.status === 'prescribed').length,
      totalQuantityDispensed: medications.reduce((sum, m) => sum + (m.quantity || 0), 0)
    };
    
    res.json({
      medications,
      summary
    });
  } catch (error) {
    console.error('Error fetching medications by stock item:', error);
    res.status(500).json({ message: 'Error fetching medications', error });
  }
};