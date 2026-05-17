// modules/stockItem/stockItem.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// STOCK ITEM SERVICES
// ==========================================

export const getStockItems = async (
  category?: string,
  isActive?: boolean,
  isMedication?: boolean
) => {
  const where: any = {};

  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive;
  if (isMedication !== undefined) where.isMedication = isMedication;

  const items = await prisma.stockItem.findMany({
    where,
    orderBy: {
      name: 'asc'
    }
  });

  return items;
};

export const getStockItemById = async (id: string) => {
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
      StockBatch: {
        orderBy: { receivedDate: 'desc' }
      }
    }
  });

  if (!item) {
    throw new Error('Stock item not found');
  }

  return item;
};

export const createStockItem = async (itemData: any) => {
  const item = await prisma.stockItem.create({
    data: itemData
  });

  // If batchNumber provided, also create a StockBatch record
  if (itemData.batchNumber && itemData.expiryDate) {
    await prisma.stockBatch.create({
      data: {
        stockItemId: item.id,
        batchNumber: itemData.batchNumber,
        expiryDate: new Date(itemData.expiryDate),
        quantity: item.currentStock,
        costPrice: item.costPrice,
        receivedDate: new Date()
      }
    });
  }

  return item;
};

export const updateStockItem = async (id: string, updateData: any) => {
  const existingItem = await prisma.stockItem.findUnique({
    where: { id }
  });

  if (!existingItem) {
    throw new Error('Stock item not found');
  }

  const item = await prisma.stockItem.update({
    where: { id },
    data: updateData
  });

  return item;
};

export const deleteStockItem = async (id: string) => {
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
    throw new Error('Stock item not found');
  }

  if (existingItem.Medication.length > 0) {
    throw new Error('Cannot delete stock item with associated medications');
  }

  if (existingItem.StockTransaction.length > 0) {
    throw new Error('Cannot delete stock item with associated stock transactions');
  }

  if (existingItem.InvoiceItem.length > 0) {
    throw new Error('Cannot delete stock item with associated invoice items');
  }

  if (existingItem.RequisitionItem.length > 0) {
    throw new Error('Cannot delete stock item with associated requisition items');
  }

  await prisma.stockItem.delete({
    where: { id }
  });

  return { message: 'Stock item deleted successfully' };
};

export const getLowStockItems = async () => {
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

  return items;
};

export const getStockCategories = async () => {
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

  return categories.map(item => item.category).filter(Boolean);
};

export const updateStockLevel = async (
  id: string,
  quantity: number,
  transactionType: string,
  reference?: string,
  notes?: string,
  performedBy?: string
) => {
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
        performedBy: performedBy || 'system'
      }
    });

    return updatedItem;
  });

  return result;
};

export const getStockTransactions = async (id: string, page: number = 1, limit: number = 50) => {
  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, Math.max(1, limit));
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

  return {
    transactions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

export const getMedicationsByStockItem = async (id: string) => {
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

  return { medications, summary };
};

// ==========================================
// REPORT SERVICES
// ==========================================

export const getStockValueSummary = async () => {
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

  return summary;
};

export const getExpiryReport = async (days: number = 30) => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

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

  return {
    summary: {
      totalWithExpiry: stockItems.length,
      expiringSoon: expiringSoon.length,
      expired: expired.length,
      healthy: healthy.length,
      expiringValue: expiringSoon.reduce((sum, i) => sum + (i.costPrice || 0) * i.currentStock, 0)
    },
    expiringSoon: expiringSoon.slice(0, 50),
    expired: expired.slice(0, 50),
    reportPeriod: days
  };
};

export const getMovementSummary = async (startDate?: Date, endDate?: Date) => {
  const where: any = {};
  if (startDate && endDate) {
    where.transactionDate = {
      gte: startDate,
      lte: endDate
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

  const itemMovement = transactions.reduce((acc, t) => {
    const name = t.StockItem?.name || 'Unknown';
    if (!acc[name]) {
      acc[name] = { name, quantity: 0, type: t.transactionType };
    }
    acc[name].quantity += t.quantity;
    return acc;
  }, {} as Record<string, { name: string; quantity: number; type: string }>);

  return {
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
};

export const getUsageReport = async (period: string = 'month', limit: number = 20) => {
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
    .slice(0, limit);

  return {
    period,
    startDate,
    summary: {
      totalItemsDispensed: results.length,
      totalQuantity: results.reduce((sum, i) => sum + i.quantity, 0),
      topItem: results[0] || null
    },
    topItems: results
  };
};

export const getSupplierReport = async () => {
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

  return {
    summary: {
      totalSuppliers: suppliers.length,
      totalSpent,
      averageSpent: suppliers.length > 0 ? totalSpent / suppliers.length : 0,
      totalInvoices: invoices.length
    },
    suppliers: suppliers.sort((a: any, b: any) => b.totalSpent - a.totalSpent)
  };
};

export const getRequisitionSummary = async (startDate?: Date, endDate?: Date) => {
  const where: any = {};
  if (startDate && endDate) {
    where.createdAt = {
      gte: startDate,
      lte: endDate
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

  return {
    summary: {
      total: requisitions.length,
      byStatus,
      byUrgency,
      fulfillmentRate: `${fulfillmentRate}%`,
      averageItemsPerRequisition: requisitions.length > 0
        ? requisitions.reduce((sum, r) => sum + (r.RequisitionItem?.length || 0), 0) / requisitions.length
        : 0
    },
    byDepartment: Object.entries(byDepartment).map(([name, data]) => ({ name, ...(data as any) })),
    recentRequisitions: requisitions.slice(0, 20).map(r => ({
      id: r.id,
      requisitionNumber: r.requisitionNumber,
      status: r.status,
      urgency: r.urgency,
      createdAt: r.createdAt,
      itemCount: r.RequisitionItem?.length || 0
    }))
  };
};
