import { PrismaClient, StockTransactionType, RequisitionStatus, RequisitionUrgency } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// STOCK ITEM CRUD SERVICES
// ==========================================

export const create = async (data: any) => {
  const item = await prisma.stockItem.create({
    data: {
      name: data.name,
      category: data.category,
      description: data.description,
      strength: data.strength,
      unitOfMeasure: data.unitOfMeasure,
      drugCode: data.drugCode,
      reorderLevel: data.reorderLevel || 0,
      currentStock: data.currentStock || 0,
      costPrice: data.costPrice,
      isNHISCovered: data.isNHISCovered ?? true,
      isPrivateInsExempted: data.isPrivateInsExempted ?? false,
      nhisRequiresAuth: data.nhisRequiresAuth ?? false,
      privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
      supplier: data.supplier,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      batchNumber: data.batchNumber,
      isActive: data.isActive ?? true,
      tariffCode: data.tariffCode,
      vatRate: data.vatRate ?? 0,
      isTaxable: data.isTaxable ?? true,
      isMedication: data.isMedication ?? true
    }
  });

  // If batchNumber provided, also create a StockBatch record
  if (data.batchNumber && data.expiryDate && data.quantityReceived) {
    await prisma.stockBatch.create({
      data: {
        stockItemId: item.id,
        batchNumber: data.batchNumber,
        expiryDate: new Date(data.expiryDate),
        quantity: data.quantityReceived,
        costPrice: data.costPrice,
        receivedDate: new Date()
      }
    });
  }

  return item;
};

export const getAll = async (filters: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { category, search, page = 1, limit = 50 } = filters;
  
  const where: any = {};

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { drugCode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const pageNum = Math.max(1, page);
  const limitNum = Math.min(5000, Math.max(1, limit));
  const skip = (pageNum - 1) * limitNum;

  const [data, total] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { name: 'asc' },
      include: {
        StockBatch: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' }
        }
      }
    }),
    prisma.stockItem.count({ where })
  ]);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

export const getById = async (id: string) => {
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
                  otherNames: true,
                  folderNumber: true
                }
              }
            }
          }
        },
        orderBy: { prescribedAt: 'desc' },
        take: 50
      },
      StockTransaction: {
        orderBy: { transactionDate: 'desc' },
        take: 20
      },
      InvoiceItem: {
        include: {
          Invoice: {
            select: {
              invoiceNumber: true,
              supplierName: true,
              invoiceDate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      RequisitionItem: {
        include: {
          Requisition: {
            select: {
              requisitionNumber: true,
              status: true,
              urgency: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
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

export const update = async (id: string, updateData: any) => {
  const existingItem = await prisma.stockItem.findUnique({
    where: { id }
  });

  if (!existingItem) {
    throw new Error('Stock item not found');
  }

  // Remove fields that shouldn't be updated directly
  const { id: _, createdAt, ...cleanData } = updateData;

  const item = await prisma.stockItem.update({
    where: { id },
    data: {
      ...cleanData,
      expiryDate: cleanData.expiryDate ? new Date(cleanData.expiryDate) : undefined
    }
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
      RequisitionItem: { take: 1 },
      StockBatch: { take: 1 }
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

  if (existingItem.StockBatch.length > 0) {
    throw new Error('Cannot delete stock item with associated stock batches');
  }

  await prisma.stockItem.delete({
    where: { id }
  });

  return { message: 'Stock item deleted successfully' };
};

// ==========================================
// STOCK LEVEL & TRANSACTION SERVICES
// ==========================================

export const updateStockLevel = async (
  id: string,
  quantity: number,
  transactionType: StockTransactionType,
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
    
    switch (transactionType) {
      case 'purchase':
      case 'adjustment':
        newStock += quantity;
        break;
      case 'sale':
      case 'requisition':
        newStock -= quantity;
        break;
      default:
        throw new Error('Invalid transaction type');
    }

    if (newStock < 0) {
      throw new Error(`Insufficient stock. Current: ${stockItem.currentStock}, Requested: ${quantity}`);
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
            status: true,
            urgency: true
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

// ==========================================
// STOCK BATCH SERVICES
// ==========================================

export const addStockBatch = async (
  stockItemId: string,
  batchNumber: string,
  expiryDate: Date,
  quantity: number,
  costPrice: number,
  receivedDate?: Date
) => {
  const stockItem = await prisma.stockItem.findUnique({
    where: { id: stockItemId }
  });

  if (!stockItem) {
    throw new Error('Stock item not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.stockBatch.create({
      data: {
        stockItemId,
        batchNumber,
        expiryDate,
        quantity,
        costPrice,
        receivedDate: receivedDate || new Date()
      }
    });

    // Update stock item current stock
    const updatedItem = await tx.stockItem.update({
      where: { id: stockItemId },
      data: {
        currentStock: stockItem.currentStock + quantity
      }
    });

    // Create transaction record
    await tx.stockTransaction.create({
      data: {
        stockItemId,
        transactionType: 'purchase',
        quantity,
        balanceAfter: updatedItem.currentStock,
        reference: `BATCH-${batchNumber}`,
        notes: `Added batch ${batchNumber}`,
        performedBy: 'system'
      }
    });

    return batch;
  });

  return result;
};

export const getExpiringBatches = async (daysThreshold: number = 90) => {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  const batches = await prisma.stockBatch.findMany({
    where: {
      expiryDate: {
        lte: thresholdDate,
        gte: new Date()
      },
      isActive: true,
      quantity: { gt: 0 }
    },
    include: {
      stockItem: {
        select: {
          name: true,
          category: true,
          unitOfMeasure: true,
          currentStock: true
        }
      }
    },
    orderBy: { expiryDate: 'asc' }
  });

  return batches;
};

// ==========================================
// ALERT SERVICES
// ==========================================

export const getLowStockAlerts = async (category?: string) => {
  const where: any = {
    isActive: true,
    currentStock: {
      lte: prisma.stockItem.fields.reorderLevel
    }
  };

  if (category) {
    where.category = category;
  }

  const items = await prisma.stockItem.findMany({
    where,
    orderBy: [
      { currentStock: 'asc' }
    ],
    include: {
      StockBatch: {
        where: { isActive: true },
        orderBy: { expiryDate: 'asc' },
        take: 3
      }
    }
  });

  const summary = {
    totalLowStock: items.length,
    criticalCount: items.filter(i => i.currentStock === 0).length,
    warningCount: items.filter(i => i.currentStock > 0 && i.currentStock <= i.reorderLevel).length,
    items
  };

  return summary;
};

export const getCategories = async () => {
  const categories = await prisma.stockItem.findMany({
    distinct: ['category'],
    select: {
      category: true
    },
    where: {
      category: {
        not: null
      }
    },
    orderBy: {
      category: 'asc'
    }
  });

  return categories.map(item => item.category).filter(Boolean);
};

// ==========================================
// REPORT SERVICES
// ==========================================

export const getValueSummary = async (category?: string) => {
  const where: any = { isActive: true };
  if (category) where.category = category;

  const stockItems = await prisma.stockItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      currentStock: true,
      costPrice: true,
      reorderLevel: true,
      isMedication: true
    }
  });

  const summary = {
    totalItems: stockItems.length,
    medications: stockItems.filter(i => i.isMedication).length,
    nonMedications: stockItems.filter(i => !i.isMedication).length,
    totalValue: stockItems.reduce((sum, i) => sum + (i.costPrice || 0) * i.currentStock, 0),
    lowStockItems: stockItems.filter(i => i.currentStock <= i.reorderLevel).length,
    outOfStockItems: stockItems.filter(i => i.currentStock === 0).length,
    byCategory: stockItems.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = { count: 0, value: 0, items: [] };
      }
      acc[cat].count++;
      acc[cat].value += (item.costPrice || 0) * item.currentStock;
      acc[cat].items.push(item.name);
      return acc;
    }, {} as Record<string, { count: number; value: number; items: string[] }>)
  };

  return summary;
};

export const getExpiryReport = async (days: number = 30, category?: string) => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const where: any = {
    expiryDate: { not: null },
    isActive: true
  };

  if (category) where.category = category;

  const stockItems = await prisma.stockItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      currentStock: true,
      expiryDate: true,
      unitOfMeasure: true,
      costPrice: true,
      StockBatch: {
        where: { isActive: true },
        select: {
          batchNumber: true,
          expiryDate: true,
          quantity: true
        }
      }
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

  // Get batches expiring soon
  const expiringBatches = await prisma.stockBatch.findMany({
    where: {
      expiryDate: {
        gte: today,
        lte: futureDate
      },
      isActive: true,
      quantity: { gt: 0 }
    },
    include: {
      stockItem: {
        select: {
          name: true,
          category: true
        }
      }
    },
    orderBy: { expiryDate: 'asc' }
  });

  return {
    summary: {
      totalWithExpiry: stockItems.length,
      expiringSoon: expiringSoon.length,
      expired: expired.length,
      healthy: healthy.length,
      expiringValue: expiringSoon.reduce((sum, i) => sum + (i.costPrice || 0) * i.currentStock, 0),
      expiringBatches: expiringBatches.length
    },
    expiringSoon: expiringSoon.slice(0, 50),
    expired: expired.slice(0, 50),
    expiringBatches: expiringBatches.slice(0, 50),
    reportPeriod: days
  };
};

export const getMovementSummary = async (startDate?: Date, endDate?: Date, category?: string) => {
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
          category: true,
          isMedication: true
        }
      }
    },
    orderBy: { transactionDate: 'desc' }
  });

  // Filter by category if provided
  let filteredTransactions = transactions;
  if (category) {
    filteredTransactions = transactions.filter(t => t.StockItem?.category === category);
  }

  const byType = {
    purchase: filteredTransactions.filter(t => t.transactionType === 'purchase'),
    sale: filteredTransactions.filter(t => t.transactionType === 'sale'),
    requisition: filteredTransactions.filter(t => t.transactionType === 'requisition'),
    adjustment: filteredTransactions.filter(t => t.transactionType === 'adjustment')
  };

  const itemMovement = filteredTransactions.reduce((acc, t) => {
    const name = t.StockItem?.name || 'Unknown';
    if (!acc[name]) {
      acc[name] = { 
        name, 
        category: t.StockItem?.category || 'Unknown',
        quantity: 0, 
        purchaseQuantity: 0,
        saleQuantity: 0,
        requisitionQuantity: 0
      };
    }
    acc[name].quantity += t.quantity;
    if (t.transactionType === 'purchase') acc[name].purchaseQuantity += t.quantity;
    if (t.transactionType === 'sale') acc[name].saleQuantity += t.quantity;
    if (t.transactionType === 'requisition') acc[name].requisitionQuantity += t.quantity;
    return acc;
  }, {} as Record<string, any>);

  return {
    period: { startDate: startDate || null, endDate: endDate || null },
    totalTransactions: filteredTransactions.length,
    totalIn: byType.purchase.reduce((sum, t) => sum + t.quantity, 0),
    totalOut: [...byType.sale, ...byType.requisition].reduce((sum, t) => sum + t.quantity, 0),
    byType: {
      purchases: byType.purchase.length,
      purchaseQuantity: byType.purchase.reduce((sum, t) => sum + t.quantity, 0),
      purchaseValue: byType.purchase.reduce((sum, t) => {
        const cost = t.StockItem?.costPrice || 0;
        return sum + (cost * t.quantity);
      }, 0),
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

export const getUsageReport = async (period: string = 'month', limit: number = 20, category?: string) => {
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

  const salesWhere: any = {
    transactionType: 'sale',
    transactionDate: { gte: startDate }
  };

  const requisitionsWhere: any = {
    transactionType: 'requisition',
    transactionDate: { gte: startDate }
  };

  const [sales, requisitions] = await Promise.all([
    prisma.stockTransaction.findMany({
      where: salesWhere,
      include: {
        StockItem: {
          select: {
            name: true,
            category: true,
            unitOfMeasure: true,
            isMedication: true
          }
        }
      }
    }),
    prisma.stockTransaction.findMany({
      where: requisitionsWhere,
      include: {
        StockItem: {
          select: {
            name: true,
            category: true,
            unitOfMeasure: true,
            isMedication: true
          }
        }
      }
    })
  ]);

  let allTransactions = [...sales, ...requisitions];
  
  // Filter by category if provided
  if (category) {
    allTransactions = allTransactions.filter(t => t.StockItem?.category === category);
  }

  const itemUsage = allTransactions.reduce((acc, t) => {
    const name = t.StockItem?.name || 'Unknown';
    if (!acc[name]) {
      acc[name] = {
        name,
        category: t.StockItem?.category || 'other',
        unit: t.StockItem?.unitOfMeasure || 'unit',
        isMedication: t.StockItem?.isMedication || false,
        quantity: 0,
        transactions: 0,
        salesQuantity: 0,
        requisitionQuantity: 0
      };
    }
    acc[name].quantity += t.quantity;
    acc[name].transactions++;
    if (t.transactionType === 'sale') acc[name].salesQuantity += t.quantity;
    if (t.transactionType === 'requisition') acc[name].requisitionQuantity += t.quantity;
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
      totalQuantity: results.reduce((sum, i: any) => sum + i.quantity, 0),
      topItem: results[0] || null,
      medicationsOnly: results.filter((i: any) => i.isMedication).length
    },
    topItems: results
  };
};

export const getSupplierReport = async (supplierId?: string) => {
  const invoicesWhere: any = {};
  if (supplierId) {
    // Note: supplier in StockItem doesn't have ID, just name
    // So we filter by supplier name instead
  }

  const invoices = await prisma.invoice.findMany({
    where: invoicesWhere,
    include: {
      InvoiceItem: {
        include: {
          StockItem: {
            select: {
              name: true,
              category: true,
              drugCode: true
            }
          }
        }
      }
    },
    orderBy: { invoiceDate: 'desc' }
  });

  const supplierSummary = invoices.reduce((acc, inv) => {
    const supplierName = inv.supplierName;
    if (!acc[supplierName]) {
      acc[supplierName] = {
        name: supplierName,
        totalSpent: 0,
        invoiceCount: 0,
        itemCount: 0,
        uniqueItems: new Set(),
        lastOrderDate: inv.invoiceDate,
        firstOrderDate: inv.invoiceDate
      };
    }
    acc[supplierName].totalSpent += inv.totalAmount;
    acc[supplierName].invoiceCount++;
    acc[supplierName].itemCount += inv.InvoiceItem?.length || 0;
    inv.InvoiceItem?.forEach(item => {
      if (item.StockItem?.name) {
        acc[supplierName].uniqueItems.add(item.StockItem.name);
      }
    });
    if (new Date(inv.invoiceDate) < new Date(acc[supplierName].firstOrderDate)) {
      acc[supplierName].firstOrderDate = inv.invoiceDate;
    }
    if (new Date(inv.invoiceDate) > new Date(acc[supplierName].lastOrderDate)) {
      acc[supplierName].lastOrderDate = inv.invoiceDate;
    }
    return acc;
  }, {} as Record<string, any>);

  // Convert Set to size
  const suppliers = Object.values(supplierSummary).map((s: any) => ({
    ...s,
    uniqueItemCount: s.uniqueItems.size,
    uniqueItems: undefined
  }));

  const totalSpent = suppliers.reduce((sum, s: any) => sum + s.totalSpent, 0);

  return {
    summary: {
      totalSuppliers: suppliers.length,
      totalSpent,
      averageSpent: suppliers.length > 0 ? totalSpent / suppliers.length : 0,
      totalInvoices: invoices.length,
      averageItemsPerInvoice: invoices.length > 0 
        ? invoices.reduce((sum, inv) => sum + (inv.InvoiceItem?.length || 0), 0) / invoices.length 
        : 0
    },
    suppliers: suppliers.sort((a: any, b: any) => b.totalSpent - a.totalSpent)
  };
};

export const getRequisitionSummary = async (startDate?: Date, endDate?: Date, status?: RequisitionStatus) => {
  const where: any = {};
  
  if (startDate && endDate) {
    where.createdAt = {
      gte: startDate,
      lte: endDate
    };
  }

  if (status) {
    where.status = status;
  }

  const requisitions = await prisma.requisition.findMany({
    where,
    include: {
      RequisitionItem: {
        include: {
          StockItem: {
            select: {
              name: true,
              category: true,
              unitOfMeasure: true
            }
          }
        }
      },
      departments: {
        select: { 
          id: true,
          name: true 
        }
      },
      requestedBy: {
        select: {
          id: true,
          fullName: true,
          username: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
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
      acc[deptName] = { 
        total: 0, 
        fulfilled: 0, 
        approved: 0,
        items: 0,
        totalQuantity: 0
      };
    }
    acc[deptName].total++;
    if (r.status === 'fulfilled') acc[deptName].fulfilled++;
    if (r.status === 'approved') acc[deptName].approved++;
    acc[deptName].items += r.RequisitionItem?.length || 0;
    acc[deptName].totalQuantity += r.RequisitionItem?.reduce((sum, item) => sum + (item.quantityApproved || item.quantityRequested), 0) || 0;
    return acc;
  }, {} as Record<string, any>);

  // Top requested items
  const itemRequests: Record<string, any> = {};
  requisitions.forEach(r => {
    r.RequisitionItem?.forEach(item => {
      const name = item.StockItem?.name || 'Unknown';
      if (!itemRequests[name]) {
        itemRequests[name] = {
          name,
          category: item.StockItem?.category || 'Unknown',
          totalRequested: 0,
          totalApproved: 0,
          totalFulfilled: 0,
          requestCount: 0
        };
      }
      itemRequests[name].totalRequested += item.quantityRequested;
      itemRequests[name].totalApproved += item.quantityApproved || 0;
      itemRequests[name].totalFulfilled += item.quantityFulfilled || 0;
      itemRequests[name].requestCount++;
    });
  });

  const topRequestedItems = Object.values(itemRequests)
    .sort((a: any, b: any) => b.totalRequested - a.totalRequested)
    .slice(0, 10);

  return {
    summary: {
      total: requisitions.length,
      byStatus,
      byUrgency,
      fulfillmentRate: `${fulfillmentRate}%`,
      averageItemsPerRequisition: requisitions.length > 0
        ? requisitions.reduce((sum, r) => sum + (r.RequisitionItem?.length || 0), 0) / requisitions.length
        : 0,
      totalItemsRequested: requisitions.reduce((sum, r) => 
        sum + (r.RequisitionItem?.reduce((itemSum, item) => itemSum + item.quantityRequested, 0) || 0), 0)
    },
    byDepartment: Object.entries(byDepartment).map(([name, data]) => ({ name, ...(data as any) })),
    topRequestedItems,
    recentRequisitions: requisitions.slice(0, 20).map(r => ({
      id: r.id,
      requisitionNumber: r.requisitionNumber,
      status: r.status,
      urgency: r.urgency,
      createdAt: r.createdAt,
      department: r.departments?.name,
      requestedBy: r.requestedBy?.fullName,
      itemCount: r.RequisitionItem?.length || 0
    }))
  };
};

// ==========================================
// MEDICATION SERVICES
// ==========================================

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
    orderBy: { prescribedAt: 'desc' }
  });

  const summary = {
    totalPrescribed: medications.length,
    dispensed: medications.filter(m => m.status === 'dispensed').length,
    administered: medications.filter(m => m.status === 'administered').length,
    cancelled: medications.filter(m => m.status === 'cancelled').length,
    pending: medications.filter(m => m.status === 'prescribed').length,
    totalQuantityDispensed: medications.reduce((sum, m) => sum + (m.quantity || 0), 0),
    uniquePatients: new Set(medications.map(m => m.Attendance?.patientId)).size
  };

  return { medications, summary };
};